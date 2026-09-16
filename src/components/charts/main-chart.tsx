"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card } from "@/components/ui/card";
import { formatCompactNumber, formatDate } from "@/lib/utils";
import type { PeriodKey } from "@/services/analytics/dashboard-stats";

type Metric = "views" | "likes" | "comments" | "shares";
type PlatformKey = "YOUTUBE" | "TIKTOK" | "INSTAGRAM" | "TWITCH" | "FACEBOOK" | "X";

const METRICS: { key: Metric; label: string }[] = [
  { key: "views", label: "Vues" },
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Commentaires" },
  { key: "shares", label: "Partages" },
];

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "24h", label: "24h" },
  { key: "7d", label: "7j" },
  { key: "30d", label: "30j" },
  { key: "90d", label: "90j" },
  { key: "1y", label: "1 an" },
];

const PLATFORMS: { key: PlatformKey; label: string; color: string }[] = [
  { key: "YOUTUBE", label: "YouTube", color: "#FF3B30" },
  { key: "TIKTOK", label: "TikTok", color: "#25F4EE" },
  { key: "INSTAGRAM", label: "Instagram", color: "#E1306C" },
  { key: "TWITCH", label: "Twitch", color: "#9146FF" },
];

export function MainChart() {
  const [metric, setMetric] = useState<Metric>("views");
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [platforms, setPlatforms] = useState<PlatformKey[]>(["YOUTUBE", "TIKTOK"]);
  const [data, setData] = useState<{ date: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const togglePlatform = (p: PlatformKey) => {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ metric, period, platforms: platforms.join(",") });
      const res = await fetch(`/api/stats?${params.toString()}`);
      const json = await res.json();
      setData(json.series ?? []);
    } finally {
      setLoading(false);
    }
  }, [metric, period, platforms]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 mb-5">
        <div className="flex flex-wrap items-center gap-2">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                metric === m.key
                  ? "bg-accent text-accent-foreground border-accent"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
          <div className="flex-1" />
          <div className="flex items-center gap-1 rounded-full border border-border p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                  period === p.key ? "bg-surface-hover text-foreground" : "text-muted-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {PLATFORMS.map((p) => (
            <label key={p.key} className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={platforms.includes(p.key)}
                onChange={() => togglePlatform(p.key)}
                className="accent-current"
                style={{ accentColor: p.color }}
              />
              <span style={{ color: platforms.includes(p.key) ? p.color : undefined }} className={!platforms.includes(p.key) ? "text-muted-foreground" : ""}>
                {p.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="h-72">
        {loading ? (
          <div className="skeleton h-full w-full" />
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Aucune donnée disponible pour cette sélection.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(255 85% 65%)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(255 85% 65%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(228 15% 18%)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => formatDate(d)}
                stroke="hsl(220 10% 62%)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v) => formatCompactNumber(v)}
                stroke="hsl(220 10% 62%)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(228 22% 10%)",
                  border: "1px solid hsl(228 15% 18%)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelFormatter={(d) => formatDate(d as string)}
                formatter={(v: number) => [formatCompactNumber(v), METRICS.find((m) => m.key === metric)?.label]}
              />
              <Area type="monotone" dataKey="value" stroke="hsl(255 85% 65%)" strokeWidth={2} fill="url(#colorMetric)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
