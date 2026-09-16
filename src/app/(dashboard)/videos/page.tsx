"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCompactNumber, formatDate } from "@/lib/utils";
import { PLATFORM_META, type PlatformKey } from "@/types/platform";

interface VideoItem {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  platform: PlatformKey;
  contentType: string;
  publishedAt: string | null;
  views: number;
  likes: number;
  comments: number;
  engagement: number;
  performanceScore: number | null;
}

const PLATFORM_FILTERS: { key: PlatformKey | ""; label: string }[] = [
  { key: "", label: "Toutes" },
  { key: "YOUTUBE", label: "YouTube" },
  { key: "TIKTOK", label: "TikTok" },
  { key: "INSTAGRAM", label: "Instagram" },
  { key: "TWITCH", label: "Twitch" },
  { key: "FACEBOOK", label: "Facebook" },
  { key: "X", label: "X" },
];

const TYPE_FILTERS = [
  { key: "", label: "Tous types" },
  { key: "VIDEO", label: "Vidéo" },
  { key: "SHORT", label: "Short" },
  { key: "REEL", label: "Reel" },
  { key: "LIVE", label: "Live" },
  { key: "POST", label: "Post" },
];

export default function VideosPage() {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState<PlatformKey | "">("");
  const [contentType, setContentType] = useState("");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, platform, type: contentType, sort, page: String(page) });
      const res = await fetch(`/api/videos?${params.toString()}`);
      const data = await res.json();
      setItems(data.items ?? []);
      setTotalPages(data.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
  }, [search, platform, contentType, sort, page]);

  useEffect(() => {
    const timeout = setTimeout(load, 300); // debounce recherche
    return () => clearTimeout(timeout);
  }, [load]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold">Mes vidéos</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Tous tes contenus, toutes plateformes confondues.</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une vidéo..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {PLATFORM_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => { setPlatform(f.key as PlatformKey | ""); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                platform === f.key ? "bg-accent text-accent-foreground border-accent" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="w-px bg-border mx-1" />
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => { setContentType(f.key); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                contentType === f.key ? "bg-accent text-accent-foreground border-accent" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="flex-1" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="text-xs bg-surface border border-border rounded-full px-3 py-1.5 text-muted-foreground"
          >
            <option value="recent">Plus récentes</option>
            <option value="views">Plus vues</option>
            <option value="performance">Meilleur score</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-56" />)}
        </div>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground text-sm">
          Aucune vidéo ne correspond à ta recherche.
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((video) => (
            <Link key={video.id} href={`/videos/${video.id}`}>
              <Card className="overflow-hidden card-hover h-full">
                <div className="relative aspect-video bg-muted">
                  {video.thumbnailUrl ? (
                    <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                      Pas de miniature
                    </div>
                  )}
                  <Badge
                    className="absolute top-2 left-2"
                    style={{ backgroundColor: `${PLATFORM_META[video.platform].color}22`, color: PLATFORM_META[video.platform].color, borderColor: `${PLATFORM_META[video.platform].color}44` }}
                  >
                    {PLATFORM_META[video.platform].label}
                  </Badge>
                  {video.performanceScore !== null && (
                    <Badge className="absolute top-2 right-2" variant="default">
                      {video.performanceScore}/100
                    </Badge>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-medium line-clamp-2 mb-2">{video.title}</h3>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{video.publishedAt ? formatDate(video.publishedAt) : "Date inconnue"}</span>
                    <span>{formatCompactNumber(video.views)} vues</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="h-8 w-8 rounded-lg border border-border flex items-center justify-center disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="h-8 w-8 rounded-lg border border-border flex items-center justify-center disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
