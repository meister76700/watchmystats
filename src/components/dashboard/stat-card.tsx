import { Card } from "@/components/ui/card";
import { formatCompactNumber, formatPercent } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  changePercent,
  icon: Icon,
}: {
  label: string;
  value: number;
  changePercent: number | null;
  icon: LucideIcon;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="text-2xl font-semibold">{formatCompactNumber(value)}</div>
      {changePercent !== null && (
        <div className={changePercent >= 0 ? "stat-pill-up mt-2 inline-block" : "stat-pill-down mt-2 inline-block"}>
          {formatPercent(changePercent)}
        </div>
      )}
    </Card>
  );
}
