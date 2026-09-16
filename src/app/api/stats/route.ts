import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { getTimeSeries, type PeriodKey } from "@/services/analytics/dashboard-stats";
import type { Platform } from "@prisma/client";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const metric = (searchParams.get("metric") ?? "views") as "views" | "likes" | "comments" | "shares";
  const period = (searchParams.get("period") ?? "30d") as PeriodKey;
  const platformsParam = searchParams.get("platforms");
  const platforms = platformsParam
    ? (platformsParam.split(",").filter(Boolean) as Platform[])
    : undefined;

  const series = await getTimeSeries(userId, period, metric, platforms);

  return NextResponse.json({ series });
}
