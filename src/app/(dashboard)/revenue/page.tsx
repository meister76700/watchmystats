import { redirect } from "next/navigation";
import { requireCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PLATFORM_META, type PlatformKey } from "@/types/platform";

const ALL_PLATFORMS: PlatformKey[] = ["YOUTUBE", "TIKTOK", "INSTAGRAM", "TWITCH", "FACEBOOK", "X"];

export default async function RevenuePage() {
  let userId: string;
  try {
    userId = await requireCurrentUserId();
  } catch {
    redirect("/login");
  }

  const accounts = await prisma.platformAccount.findMany({
    where: { userId },
    include: { revenues: { orderBy: { periodStart: "desc" } } },
  });
  const accountByPlatform = new Map(accounts.map((a) => [a.platform, a]));

  const totalCents = accounts.reduce(
    (sum, a) => sum + a.revenues.reduce((s, r) => s + r.amountCents, 0),
    0
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold">Revenus</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Revenus estimés, uniquement lorsque la plateforme les rend disponibles via son API officielle.
        </p>
      </div>

      <Card className="p-5">
        <div className="text-xs text-muted-foreground">Total estimé (toutes plateformes)</div>
        <div className="text-3xl font-bold mt-1">{formatCurrency(totalCents)}</div>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        {ALL_PLATFORMS.map((platform) => {
          const account = accountByPlatform.get(platform);
          const meta = PLATFORM_META[platform];
          const revenues = account?.revenues ?? [];
          const total = revenues.reduce((s, r) => s + r.amountCents, 0);

          return (
            <Card key={platform} className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-semibold text-white"
                  style={{ backgroundColor: meta.color }}
                >
                  {meta.label[0]}
                </div>
                <span className="font-medium text-sm">{meta.label}</span>
              </div>

              {!account ? (
                <p className="text-xs text-muted-foreground">Plateforme non connectée.</p>
              ) : revenues.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Données de revenus non disponibles pour cette plateforme.
                </p>
              ) : (
                <>
                  <div className="text-xl font-semibold mb-2">{formatCurrency(total)}</div>
                  <div className="space-y-1">
                    {revenues.slice(0, 3).map((r) => (
                      <div key={r.id} className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatDate(r.periodStart)} – {formatDate(r.periodEnd)}</span>
                        <span>{formatCurrency(r.amountCents, r.currency)} {r.isEstimate ? "(estimé)" : ""}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
