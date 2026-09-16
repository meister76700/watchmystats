import { PrismaClient, Platform, ContentType } from "@prisma/client";
import bcrypt from "bcryptjs";

// ============================================================================
// Génère un compte de démonstration ("demo@watchmystats.app") avec des
// données fictives clairement marquées isDemo=true, permettant de voir
// WatchMyStats fonctionner immédiatement sans connecter de vrai compte.
//
// Lancer avec: npm run db:seed
// ============================================================================

const prisma = new PrismaClient();

const PLATFORMS: { platform: Platform; displayName: string; handle: string; baseFollowers: number }[] = [
  { platform: "YOUTUBE", displayName: "Créateur Démo", handle: "@createur-demo", baseFollowers: 128_400 },
  { platform: "TIKTOK", displayName: "Créateur Démo", handle: "@createur.demo", baseFollowers: 245_100 },
  { platform: "INSTAGRAM", displayName: "Créateur Démo", handle: "@createur_demo", baseFollowers: 87_600 },
  { platform: "TWITCH", displayName: "CreateurDemo", handle: "@createurdemo", baseFollowers: 15_200 },
];

const VIDEO_TITLES = [
  "Comment j'ai doublé mes vues en 30 jours",
  "Mon setup de tournage complet 2026",
  "Réagir à mes débuts (c'était horrible)",
  "5 erreurs que tous les débutants font",
  "J'ai testé le montage IA pendant 1 semaine",
  "Behind the scenes : une journée de tournage",
  "Le contenu qui a explosé (et pourquoi)",
  "Questions/Réponses avec la communauté",
  "Mon avis sur les nouvelles tendances",
  "Collab avec un créateur invité",
  "Retour d'expérience après 1 an",
  "Le matériel que j'utilise vraiment",
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log("Nettoyage des données démo existantes...");
  const existingDemoUser = await prisma.user.findUnique({ where: { email: "demo@watchmystats.app" } });
  if (existingDemoUser) {
    await prisma.user.delete({ where: { id: existingDemoUser.id } });
  }

  console.log("Création de l'utilisateur démo...");
  const passwordHash = await bcrypt.hash("Demo1234", 12);
  const user = await prisma.user.create({
    data: {
      name: "Créateur Démo",
      email: "demo@watchmystats.app",
      password: passwordHash,
      isDemoAccount: true,
      emailVerified: new Date(),
    },
  });

  for (const p of PLATFORMS) {
    console.log(`Création du compte démo ${p.platform}...`);

    const platformAccount = await prisma.platformAccount.create({
      data: {
        userId: user.id,
        platform: p.platform,
        externalAccountId: `demo-${p.platform.toLowerCase()}`,
        displayName: p.displayName,
        handle: p.handle,
        avatarUrl: `https://i.pravatar.cc/150?u=${p.platform}`,
        isDemo: true,
        isActive: true,
        followerCount: p.baseFollowers,
        lastSyncAt: new Date(),
        lastSyncStatus: "SUCCESS",
      },
    });

    // Historique des followers sur 90 jours (croissance progressive avec un peu de bruit)
    const followerHistory = [];
    for (let day = 90; day >= 0; day--) {
      const growthFactor = 1 - day / 400; // légère tendance de croissance
      const noise = randomInt(-500, 500);
      const count = Math.max(0, Math.round(p.baseFollowers * growthFactor) + noise);
      followerHistory.push({
        platformAccountId: platformAccount.id,
        recordedAt: new Date(Date.now() - day * 86_400_000),
        followerCount: count,
        viewCount: p.platform === "YOUTUBE" ? count * randomInt(20, 30) : null,
      });
    }
    await prisma.followerStatistic.createMany({ data: followerHistory });

    // Contenus + historique de statistiques par contenu
    const videoCount = randomInt(8, 12);
    const contentType: ContentType =
      p.platform === "TWITCH" ? "LIVE" : p.platform === "INSTAGRAM" ? "REEL" : p.platform === "TIKTOK" ? "SHORT" : "VIDEO";

    for (let i = 0; i < videoCount; i++) {
      const publishedAt = new Date(Date.now() - randomInt(1, 85) * 86_400_000);
      const baseViews = randomInt(5_000, 250_000);

      const video = await prisma.video.create({
        data: {
          platformAccountId: platformAccount.id,
          externalId: `demo-${p.platform.toLowerCase()}-video-${i}`,
          title: VIDEO_TITLES[randomInt(0, VIDEO_TITLES.length - 1)],
          thumbnailUrl: `https://picsum.photos/seed/${p.platform}${i}/400/225`,
          url: "#",
          contentType,
          publishedAt,
          isDemo: true,
        },
      });

      // 3 points d'historique pour permettre de tracer une courbe d'évolution
      const snapshots = [0.4, 0.75, 1];
      for (const fraction of snapshots) {
        const views = Math.round(baseViews * fraction);
        const likes = Math.round(views * (randomInt(3, 9) / 100));
        const comments = Math.round(views * (randomInt(1, 3) / 1000));
        const shares = p.platform === "TWITCH" ? null : Math.round(views * (randomInt(1, 2) / 1000));

        await prisma.videoStatistic.create({
          data: {
            videoId: video.id,
            recordedAt: new Date(publishedAt.getTime() + fraction * 5 * 86_400_000),
            views,
            likes,
            comments,
            shares,
            avgViewDuration: p.platform === "YOUTUBE" ? randomInt(60, 400) : null,
            retentionRate: p.platform === "YOUTUBE" ? randomInt(35, 75) : null,
            performanceScore: randomInt(40, 98),
          },
        });
      }
    }

    // Revenus : disponibles uniquement pour YouTube dans ce jeu de démo,
    // pour illustrer le cas "disponible" vs "non disponible selon l'API".
    if (p.platform === "YOUTUBE") {
      for (let month = 2; month >= 0; month--) {
        const periodStart = new Date();
        periodStart.setMonth(periodStart.getMonth() - month, 1);
        const periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + 1, 0);

        await prisma.revenue.create({
          data: {
            platformAccountId: platformAccount.id,
            periodStart,
            periodEnd,
            amountCents: randomInt(80_000, 240_000),
            currency: "EUR",
            isEstimate: true,
            isDemo: true,
          },
        });
      }
    }
  }

  console.log("Création des notifications démo...");
  await prisma.notification.createMany({
    data: [
      {
        userId: user.id,
        type: "SYNC_SUCCESS",
        title: "Synchronisation terminée",
        message: "Tes statistiques YouTube et TikTok ont été mises à jour.",
      },
      {
        userId: user.id,
        type: "WEEKLY_REPORT",
        title: "Ton rapport hebdomadaire est prêt",
        message: "Consulte tes performances de la semaine dernière.",
      },
    ],
  });

  console.log("\n✅ Compte démo créé avec succès !");
  console.log("   Email    : demo@watchmystats.app");
  console.log("   Mot de passe : Demo1234\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
