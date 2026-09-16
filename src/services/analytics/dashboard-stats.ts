import { prisma } from "@/lib/prisma";
import type { Platform } from "@prisma/client";

// ============================================================================
// Agrège les statistiques globales d'un utilisateur (toutes plateformes ou
// filtrées) sur une période donnée, avec comparaison à la période précédente
// de même durée — utilisé par le dashboard principal et par le graphique.
// ============================================================================

export type PeriodKey = "24h" | "7d" | "30d" | "90d" | "1y" | "custom";

export function periodToMs(period: PeriodKey): number {
  switch (period) {
    case "24h":
      return 86_400_000;
    case "7d":
      return 7 * 86_400_000;
    case "30d":
      return 30 * 86_400_000;
    case "90d":
      return 90 * 86_400_000;
    case "1y":
      return 365 * 86_400_000;
    default:
      return 30 * 86_400_000;
  }
}

export interface GlobalStats {
  totalViews: number;
  totalFollowers: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  viewsChangePercent: number | null;
  followersChangePercent: number | null;
  likesChangePercent: number | null;
  commentsChangePercent: number | null;
}

export async function getGlobalStats(
  userId: string,
  period: PeriodKey,
  platforms?: Platform[],
  customRange?: { start: Date; end: Date }
): Promise<GlobalStats> {
  const now = new Date();
  const durationMs = customRange
    ? customRange.end.getTime() - customRange.start.getTime()
    : periodToMs(period);

  const periodStart = customRange?.start ?? new Date(now.getTime() - durationMs);
  const previousPeriodStart = new Date(periodStart.getTime() - durationMs);

  const accounts = await prisma.platformAccount.findMany({
    where: { userId, isActive: true, ...(platforms?.length ? { platform: { in: platforms } } : {}) },
    select: { id: true },
  });
  const accountIds = accounts.map((a) => a.id);

  if (accountIds.length === 0) {
    return {
      totalViews: 0,
      totalFollowers: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      viewsChangePercent: null,
      followersChangePercent: null,
      likesChangePercent: null,
      commentsChangePercent: null,
    };
  }

  const [currentStats, previousStats, latestFollowers, previousFollowers] = await Promise.all([
    aggregateVideoStats(accountIds, periodStart, now),
    aggregateVideoStats(accountIds, previousPeriodStart, periodStart),
    getFollowerCountAt(accountIds, now),
    getFollowerCountAt(accountIds, periodStart),
  ]);

  return {
    totalViews: currentStats.views,
    totalFollowers: latestFollowers,
    totalLikes: currentStats.likes,
    totalComments: currentStats.comments,
    totalShares: currentStats.shares,
    viewsChangePercent: percentChange(currentStats.views, previousStats.views),
    followersChangePercent: percentChange(latestFollowers, previousFollowers),
    likesChangePercent: percentChange(currentStats.likes, previousStats.likes),
    commentsChangePercent: percentChange(currentStats.comments, previousStats.comments),
  };
}

async function aggregateVideoStats(accountIds: string[], start: Date, end: Date) {
  // Pour chaque vidéo, on prend le dernier point de statistique enregistré
  // dans la fenêtre temporelle (les stats sont cumulatives par nature).
  const stats = await prisma.videoStatistic.findMany({
    where: {
      recordedAt: { gte: start, lte: end },
      video: { platformAccountId: { in: accountIds } },
    },
    orderBy: { recordedAt: "desc" },
    select: { videoId: true, views: true, likes: true, comments: true, shares: true },
  });

  const latestByVideo = new Map<string, (typeof stats)[number]>();
  for (const s of stats) {
    if (!latestByVideo.has(s.videoId)) latestByVideo.set(s.videoId, s);
  }

  let views = 0, likes = 0, comments = 0, shares = 0;
  for (const s of latestByVideo.values()) {
    views += s.views;
    likes += s.likes;
    comments += s.comments;
    shares += s.shares ?? 0;
  }

  return { views, likes, comments, shares };
}

async function getFollowerCountAt(accountIds: string[], at: Date): Promise<number> {
  let total = 0;
  for (const accountId of accountIds) {
    const closest = await prisma.followerStatistic.findFirst({
      where: { platformAccountId: accountId, recordedAt: { lte: at } },
      orderBy: { recordedAt: "desc" },
    });
    total += closest?.followerCount ?? 0;
  }
  return total;
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Série temporelle pour le graphique principal, groupée par jour. */
export async function getTimeSeries(
  userId: string,
  period: PeriodKey,
  metric: "views" | "likes" | "comments" | "shares",
  platforms?: Platform[]
): Promise<{ date: string; value: number }[]> {
  const durationMs = periodToMs(period);
  const start = new Date(Date.now() - durationMs);

  const accounts = await prisma.platformAccount.findMany({
    where: { userId, isActive: true, ...(platforms?.length ? { platform: { in: platforms } } : {}) },
    select: { id: true },
  });
  const accountIds = accounts.map((a) => a.id);
  if (accountIds.length === 0) return [];

  const stats = await prisma.videoStatistic.findMany({
    where: { recordedAt: { gte: start }, video: { platformAccountId: { in: accountIds } } },
    select: { recordedAt: true, [metric]: true },
    orderBy: { recordedAt: "asc" },
  });

  const byDay = new Map<string, number>();
  for (const s of stats) {
    const day = s.recordedAt.toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + ((s as unknown as Record<string, number | null>)[metric] ?? 0));
  }

  return Array.from(byDay.entries()).map(([date, value]) => ({ date, value }));
}
