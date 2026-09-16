"use client";

import { useEffect, useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Insight {
  emoji: string;
  message: string;
}

export default function AIPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [narrative, setNarrative] = useState<string>("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/insights");
      const data = await res.json();
      setInsights(data.insights ?? []);
      setNarrative(data.narrative ?? "");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" /> WatchMyStats AI
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Analyses générées uniquement à partir de tes données réelles — jamais inventées.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Actualiser
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-16" />)}
        </div>
      ) : (
        <>
          <Card className="p-5 bg-glow-gradient">
            <p className="text-sm leading-relaxed whitespace-pre-line">{narrative}</p>
          </Card>

          <div className="space-y-2">
            {insights.map((insight, i) => (
              <Card key={i} className="p-4 flex items-start gap-3">
                <span className="text-xl">{insight.emoji}</span>
                <p className="text-sm">{insight.message}</p>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
