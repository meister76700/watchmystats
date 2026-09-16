import { prisma } from "@/lib/prisma";
import { decryptToken, encryptToken } from "@/lib/crypto";
import { getConnector } from "@/services/platforms/registry";
import { calculatePerformanceScore } from "@/services/analytics/performance-score";
import type { SyncTrigger } from "@prisma/client";

// ============================================================================
// Orchestrateur de synchronisation. Point d'entrée unique appelé par :
// - la route API "sync manuel" (bouton dans l'UI)
// - un job planifié (cron / Vercel Cron) pour la synchronisation automatique
//
// Pour chaque compte de plateforme connecté :
// 1. Renouvelle le token OAuth s'il est expiré
// 2. Récupère les statistiques du compte (abonnés) et les enregistre en
//    historique (FollowerStatistic) sans écraser les anciennes valeurs
// 3. Récupère les vidéos/contenus et upsert chacune (Video), puis enregistre
//    un nouveau point de statistique horodaté (VideoStatistic) — l'historique
//    est toujours préservé pour permettre les graphiques d'évolution
// 4. Calcule le Performance Score de chaque contenu
// 5. Journalise le résultat dans SyncLog et gère proprement les erreurs
//    (limites API, tokens invalides, etc.) sans jamais faire planter les
//    autres comptes en cours de synchronisation
// ============================================================================

export async function syncPlatformAccount(platformAccountId: string, trigger: SyncTrigger) {
  const account = await prisma.platformAccount.findUnique({ where: { id: platformAccountId } });
  if (!account) throw new Error("Compte de plateforme introuvable.");

  if (account.isDemo) {
    // Les comptes démo n'ont pas de vraie synchronisation — les données
    // sont statiques et générées une fois par le script de seed.
    return { status: "SUCCESS" as const, videosSynced: 0 };
  }

  const syncLog = await prisma.syncLog.create({
    data: { platformAccountId, trigger, status: "SYNCING" },
  });

  await prisma.platformAccount.update({
    where: { id: platformAccountId },
    data: { lastSyncStatus: "SYNCING" },
  });

  try {
    const connector = getConnector(account.platform);

    // 1. Renouvellement du token si nécessaire
    let accessToken = account.accessTokenEnc ? decryptToken(account.accessTokenEnc) : null;
    if (!accessToken) throw new Error("Aucun token d'accès disponible pour ce compte.");

    const isExpired = account.tokenExpiresAt ? account.tokenExpiresAt < new Date() : false;
    if (isExpired && account.refreshTokenEnc) {
      const refreshed = await connector.refreshAccessToken(decryptToken(account.refreshTokenEnc));
      accessToken = refreshed.accessToken;
      await prisma.platformAccount.update({
        where: { id: platformAccountId },
        data: {
          accessTokenEnc: encryptToken(refreshed.accessToken),
          refreshTokenEnc: refreshed.refreshToken ? encryptToken(refreshed.refreshToken) : undefined,
          tokenExpiresAt: refreshed.expiresAt,
        },
      });
    }

    // 2. Statistiques du compte
    const accountStats = await connector.fetchAccountStats(accessToken);
    await prisma.$transaction([
      prisma.platformAccount.update({
        where: { id: platformAccountId },
        data: {
          displayName: accountStats.displayName ?? account.displayName,
          handle: accountStats.handle ?? account.handle,
          avatarUrl: accountStats.avatarUrl ?? account.avatarUrl,
          followerCount: accountStats.followerCount,
        },
      }),
      prisma.followerStatistic.create({
        data: {
          platformAccountId,
          followerCount: accountStats.followerCount,
          viewCount: accountStats.viewCount,
        },
      }),
    ]);

    // 3. Vidéos / contenus
    const videos = await connector.fetchVideos(accessToken);

    const videosForScoring = videos.map((v) => ({
      views: v.views,
      likes: v.likes,
      comments: v.comments,
      shares: v.shares,
      retentionRate: v.retentionRate,
      publishedAt: v.publishedAt,
    }));

    for (const v of videos) {
      const video = await prisma.video.upsert({
        where: {
          platformAccountId_externalId: { platformAccountId, externalId: v.externalId },
        },
        create: {
          platformAccountId,
          externalId: v.externalId,
          title: v.title,
          thumbnailUrl: v.thumbnailUrl,
          url: v.url,
          contentType: v.contentType,
          publishedAt: v.publishedAt,
        },
        update: {
          title: v.title,
          thumbnailUrl: v.thumbnailUrl,
        },
      });

      const score = calculatePerformanceScore(
        {
          views: v.views,
          likes: v.likes,
          comments: v.comments,
          shares: v.shares,
          retentionRate: v.retentionRate,
          publishedAt: v.publishedAt,
        },
        videosForScoring
      );

      await prisma.videoStatistic.create({
        data: {
          videoId: video.id,
          views: v.views,
          likes: v.likes,
          comments: v.comments,
          shares: v.shares,
          avgViewDuration: v.avgViewDuration,
          retentionRate: v.retentionRate,
          performanceScore: score,
        },
      });
    }

    // 4. Revenus (si l'API de la plateforme les fournit)
    const revenue = await connector.fetchRevenue(accessToken);
    if (revenue) {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      await prisma.revenue.create({
        data: {
          platformAccountId,
          periodStart,
          periodEnd: now,
          amountCents: revenue.amountCents,
          currency: revenue.currency,
          isEstimate: true,
        },
      });
    }

    await prisma.$transaction([
      prisma.syncLog.update({
        where: { id: syncLog.id },
        data: { status: "SUCCESS", finishedAt: new Date(), videosSynced: videos.length },
      }),
      prisma.platformAccount.update({
        where: { id: platformAccountId },
        data: { lastSyncStatus: "SUCCESS", lastSyncAt: new Date(), lastSyncError: null },
      }),
    ]);

    return { status: "SUCCESS" as const, videosSynced: videos.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur de synchronisation inconnue.";

    await prisma.$transaction([
      prisma.syncLog.update({
        where: { id: syncLog.id },
        data: { status: "ERROR", finishedAt: new Date(), errorMessage: message },
      }),
      prisma.platformAccount.update({
        where: { id: platformAccountId },
        data: { lastSyncStatus: "ERROR", lastSyncError: message },
      }),
    ]);

    return { status: "ERROR" as const, error: message };
  }
}

/** Synchronise tous les comptes actifs d'un utilisateur (bouton "Tout synchroniser"). */
export async function syncAllAccountsForUser(userId: string, trigger: SyncTrigger) {
  const accounts = await prisma.platformAccount.findMany({
    where: { userId, isActive: true },
  });

  const results = await Promise.allSettled(
    accounts.map((a) => syncPlatformAccount(a.id, trigger))
  );

  return results.map((r, i) => ({
    platformAccountId: accounts[i].id,
    platform: accounts[i].platform,
    ...(r.status === "fulfilled" ? r.value : { status: "ERROR" as const, error: "Échec inattendu" }),
  }));
}
