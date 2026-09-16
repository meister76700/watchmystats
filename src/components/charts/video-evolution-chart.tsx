"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { formatCompactNumber, formatDate } from "@/lib/utils";

interface Point {
  date: string;
  views: number;
  likes: number;
  comments: number;
}

export function VideoEvolutionChart({ data }: { data: Point[] }) {
  if (data.length < 2) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
        Pas encore assez de points de données pour tracer une courbe d&apos;évolution.
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(228 15% 18%)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={(d) => formatDate(d)} stroke="hsl(220 10% 62%)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(v) => formatCompactNumber(v)} stroke="hsl(220 10% 62%)" fontSize={11} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            contentStyle={{ background: "hsl(228 22% 10%)", border: "1px solid hsl(228 15% 18%)", borderRadius: 12, fontSize: 12 }}
            labelFormatter={(d) => formatDate(d as string)}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="views" name="Vues" stroke="hsl(255 85% 65%)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="likes" name="Likes" stroke="hsl(152 60% 50%)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="comments" name="Commentaires" stroke="hsl(38 92% 58%)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
