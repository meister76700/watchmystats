import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";
import { generateRuleBasedInsights, generateNarrativeInsight } from "@/services/ai/insights";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const now = new Date();
  const periodStart = new Date(now.getTime() - 30 * 86_400_000);
  const previousPeriodStart = new Date(periodStart.getTime() - 30 * 86_400_000);

  const videos = await prisma.video.findMany({
    where: { platformAccount: { userId } },
    include: { statistics: { orderBy: { recordedAt: "desc" } } },
  });

  const contentCount = videos.length;

  const latestStats = videos.map((v) => v.statistics[0]).filter(Boolean);
  const totalViews = latestStats.reduce((s, st) => s + (st?.views ?? 0), 0);

  const previousStats = videos
    .map((v) => v.statistics.find((s) => s.recordedAt <= periodStart))
    .filter(Boolean);
  const totalViewsPreviousPeriod = previousStats.reduce((s, st) => s + (st?.views ?? 0), 0);

  let topPerformingContentTitle: string | null = null;
  let topPerformingContentDiffPercent: number | null = null;
  let bestEngagementContentTitle: string | null = null;

  if (videos.length >= 3) {
    const avgViews = totalViews / videos.length;
    const top = videos
      .filter((v) => v.statistics[0])
      .sort((a, b) => (b.statistics[0]?.views ?? 0) - (a.statistics[0]?.views ?? 0))[0];
    if (top && avgViews > 0) {
      topPerformingContentTitle = top.title;
      topPerformingContentDiffPercent = Math.round(((top.statistics[0].views - avgViews) / avgViews) * 100);
    }

    const bestEngagement = videos
      .filter((v) => v.statistics[0] && v.statistics[0].views > 0)
      .sort((a, b) => {
        const engA = (a.statistics[0].likes + a.statistics[0].comments) / a.statistics[0].views;
        const engB = (b.statistics[0].likes + b.statistics[0].comments) / b.statistics[0].views;
        return engB - engA;
      })[0];
    bestEngagementContentTitle = bestEngagement?.title ?? null;
  }

  const followers = await prisma.followerStatistic.findMany({
    where: { platformAccount: { userId } },
    orderBy: { recordedAt: "desc" },
  });
  const latestFollowers = followers[0]?.followerCount ?? null;
  const oldFollowers = followers.find((f) => f.recordedAt <= periodStart)?.followerCount ?? null;
  const followerGrowthPercent =
    latestFollowers !== null && oldFollowers !== null && oldFollowers > 0
      ? Math.round(((latestFollowers - oldFollowers) / oldFollowers) * 1000) / 10
      : null;

  const insights = generateRuleBasedInsights({
    totalViews,
    totalViewsPreviousPeriod,
    topPerformingContentTitle,
    topPerformingContentDiffPercent,
    bestEngagementContentTitle,
    followerGrowthPercent,
    contentCount,
  });

  const narrative = await generateNarrativeInsight(insights);

  return NextResponse.json({ insights, narrative });
}
