import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { requireCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { MainChart } from "@/components/charts/main-chart";
import { Card } from "@/components/ui/card";
import { formatCompactNumber, formatDate } from "@/lib/utils";
import { PLATFORM_META } from "@/types/platform";

export default async function AnalyticsPage() {
  let userId: string;
  try {
    userId = await requireCurrentUserId();
  } catch {
    redirect("/login");
  }

  const videos = await prisma.video.findMany({
    where: { platformAccount: { userId } },
    include: { platformAccount: true, statistics: { orderBy: { recordedAt: "desc" }, take: 1 } },
  });

  const topVideos = videos
    .filter((v) => v.statistics[0])
    .sort((a, b) => (b.statistics[0]?.performanceScore ?? 0) - (a.statistics[0]?.performanceScore ?? 0))
    .slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Analyse détaillée de tes performances.</p>
      </div>

      <MainChart />

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Meilleurs contenus (Performance Score)</h2>
        {topVideos.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Pas encore assez de données pour établir un classement.
          </Card>
        ) : (
          <div className="space-y-2">
            {topVideos.map((video, i) => {
              const stat = video.statistics[0];
              const meta = PLATFORM_META[video.platformAccount.platform];
              return (
                <Link key={video.id} href={`/videos/${video.id}`}>
                  <Card className="p-3 flex items-center gap-4 card-hover">
                    <span className="text-sm text-muted-foreground w-5">{i + 1}</span>
                    <div className="relative h-12 w-20 rounded-lg overflow-hidden bg-muted shrink-0">
                      {video.thumbnailUrl && (
                        <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover" unoptimized />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{video.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {meta.label} · {video.publishedAt ? formatDate(video.publishedAt) : ""} · {formatCompactNumber(stat.views)} vues
                      </p>
                    </div>
                    {stat.performanceScore !== null && (
                      <span className="text-sm font-semibold text-accent shrink-0">{stat.performanceScore}/100</span>
                    )}
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
