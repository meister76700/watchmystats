import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Eye, Heart, MessageCircle, Share2 } from "lucide-react";
import { requireCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLATFORM_META } from "@/types/platform";
import { formatCompactNumber, formatDate } from "@/lib/utils";
import { comparePerformanceToAverage } from "@/services/analytics/performance-score";
import { VideoEvolutionChart } from "@/components/charts/video-evolution-chart";

export default async function VideoDetailPage({ params }: { params: { id: string } }) {
  let userId: string;
  try {
    userId = await requireCurrentUserId();
  } catch {
    redirect("/login");
  }

  const video = await prisma.video.findFirst({
    where: { id: params.id, platformAccount: { userId } },
    include: {
      platformAccount: true,
      statistics: { orderBy: { recordedAt: "asc" } },
    },
  });

  if (!video) notFound();

  const latest = video.statistics[video.statistics.length - 1];
  if (!latest) notFound();

  // Récupère les autres contenus du créateur sur la même plateforme pour la comparaison.
  const otherVideos = await prisma.video.findMany({
    where: { platformAccountId: video.platformAccountId, id: { not: video.id } },
    include: { statistics: { orderBy: { recordedAt: "desc" }, take: 1 } },
  });

  const comparisonText = comparePerformanceToAverage(
    {
      views: latest.views,
      likes: latest.likes,
      comments: latest.comments,
      shares: latest.shares,
      retentionRate: latest.retentionRate,
      publishedAt: video.publishedAt,
    },
    otherVideos
      .filter((v) => v.statistics[0])
      .map((v) => ({
        views: v.statistics[0].views,
        likes: v.statistics[0].likes,
        comments: v.statistics[0].comments,
        shares: v.statistics[0].shares,
        retentionRate: v.statistics[0].retentionRate,
        publishedAt: v.publishedAt,
      }))
  );

  const meta = PLATFORM_META[video.platformAccount.platform];
  const engagement =
    latest.views > 0 ? ((latest.likes + latest.comments + (latest.shares ?? 0)) / latest.views) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <Link href="/videos" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour aux vidéos
      </Link>

      <div className="grid md:grid-cols-[280px_1fr] gap-6">
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-muted">
          {video.thumbnailUrl ? (
            <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover" unoptimized />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-xs">Pas de miniature</div>
          )}
        </div>

        <div>
          <Badge style={{ backgroundColor: `${meta.color}22`, color: meta.color, borderColor: `${meta.color}44` }}>
            {meta.label}
          </Badge>
          <h1 className="text-xl font-semibold mt-2">{video.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {video.publishedAt ? formatDate(video.publishedAt) : "Date inconnue"}
          </p>
          {video.url && video.url !== "#" && (
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline mt-2"
            >
              Voir sur {meta.label} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          {latest.performanceScore !== null && (
            <Card className="p-4 mt-4 inline-block">
              <div className="text-xs text-muted-foreground">Performance Score</div>
              <div className="text-2xl font-bold text-accent">{latest.performanceScore} / 100</div>
              {comparisonText && <p className="text-xs text-muted-foreground mt-1">{comparisonText}</p>}
            </Card>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatBlock icon={Eye} label="Vues" value={latest.views} />
        <StatBlock icon={Heart} label="Likes" value={latest.likes} />
        <StatBlock icon={MessageCircle} label="Commentaires" value={latest.comments} />
        <StatBlock icon={Share2} label="Partages" value={latest.shares} />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Engagement</div>
          <div className="text-lg font-semibold mt-1">{engagement.toFixed(1)} %</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Durée moyenne de visionnage</div>
          <div className="text-lg font-semibold mt-1">
            {latest.avgViewDuration !== null ? `${Math.floor(latest.avgViewDuration / 60)} min ${latest.avgViewDuration % 60}s` : "Non disponible"}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Taux de rétention</div>
          <div className="text-lg font-semibold mt-1">
            {latest.retentionRate !== null ? `${latest.retentionRate.toFixed(0)} %` : "Non disponible"}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-medium text-muted-foreground mb-4">Évolution des statistiques</h2>
        <VideoEvolutionChart
          data={video.statistics.map((s) => ({
            date: s.recordedAt.toISOString(),
            views: s.views,
            likes: s.likes,
            comments: s.comments,
          }))}
        />
      </Card>
    </div>
  );
}

function StatBlock({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | null;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="text-lg font-semibold">{value !== null ? formatCompactNumber(value) : "Non disponible"}</div>
    </Card>
  );
}
