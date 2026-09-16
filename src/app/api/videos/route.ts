import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";
import type { Platform, ContentType, Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const platform = searchParams.get("platform") as Platform | null;
  const contentType = searchParams.get("type") as ContentType | null;
  const sort = searchParams.get("sort") ?? "recent"; // recent | views | performance
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = 12;

  const where: Prisma.VideoWhereInput = {
    platformAccount: { userId, ...(platform ? { platform } : {}) },
    ...(contentType ? { contentType } : {}),
    ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
  };

  const [total, videos] = await Promise.all([
    prisma.video.count({ where }),
    prisma.video.findMany({
      where,
      include: {
        platformAccount: { select: { platform: true, displayName: true } },
        statistics: { orderBy: { recordedAt: "desc" }, take: 1 },
      },
      orderBy: sort === "recent" ? { publishedAt: "desc" } : undefined,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  let items = videos.map((v) => {
    const latest = v.statistics[0];
    const engagement =
      latest && latest.views > 0
        ? ((latest.likes + latest.comments + (latest.shares ?? 0)) / latest.views) * 100
        : 0;
    return {
      id: v.id,
      title: v.title,
      thumbnailUrl: v.thumbnailUrl,
      platform: v.platformAccount.platform,
      contentType: v.contentType,
      publishedAt: v.publishedAt,
      views: latest?.views ?? 0,
      likes: latest?.likes ?? 0,
      comments: latest?.comments ?? 0,
      shares: latest?.shares ?? null,
      engagement: Math.round(engagement * 10) / 10,
      performanceScore: latest?.performanceScore ?? null,
    };
  });

  if (sort === "views") items = items.sort((a, b) => b.views - a.views);
  if (sort === "performance")
    items = items.sort((a, b) => (b.performanceScore ?? 0) - (a.performanceScore ?? 0));

  return NextResponse.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}
