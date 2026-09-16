import { redirect } from "next/navigation";
import { requireCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PLATFORM_META, type PlatformKey } from "@/types/platform";
import { Card } from "@/components/ui/card";
import { PlatformActions } from "@/components/dashboard/platform-actions";
import { formatCompactNumber, timeAgo } from "@/lib/utils";

const ALL_PLATFORMS: PlatformKey[] = ["YOUTUBE", "TIKTOK", "INSTAGRAM", "TWITCH", "FACEBOOK", "X"];

export default async function PlatformsPage() {
  let userId: string;
  try {
    userId = await requireCurrentUserId();
  } catch {
    redirect("/login");
  }

  const accounts = await prisma.platformAccount.findMany({ where: { userId } });
  const accountByPlatform = new Map(accounts.map((a) => [a.platform, a]));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold">Plateformes</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Connecte tes comptes pour centraliser tes statistiques. Toutes les connexions passent par
          l&apos;OAuth officiel de chaque plateforme — WatchMyStats ne voit jamais ton mot de passe.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {ALL_PLATFORMS.map((platform) => {
          const account = accountByPlatform.get(platform);
          const meta = PLATFORM_META[platform];
          const connected = !!account;

          return (
            <Card key={platform} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center font-semibold text-white"
                    style={{ backgroundColor: meta.color }}
                  >
                    {meta.label[0]}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{meta.label}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-success" : "bg-muted-foreground"}`} />
                      <span className="text-xs text-muted-foreground">
                        {connected ? "Connecté" : "Non connecté"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {connected && (
                <div className="mt-4 text-sm space-y-1">
                  <div className="text-muted-foreground">
                    {account.displayName ?? "Compte connecté"}
                    {account.handle ? ` (${account.handle})` : ""}
                  </div>
                  {account.followerCount !== null && (
                    <div className="text-muted-foreground">
                      {formatCompactNumber(account.followerCount)} abonnés
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {account.lastSyncAt
                      ? `Dernière synchronisation : ${timeAgo(account.lastSyncAt)}`
                      : "Jamais synchronisé"}
                  </div>
                  {account.lastSyncStatus === "ERROR" && account.lastSyncError && (
                    <div className="text-xs text-danger mt-1">Erreur : {account.lastSyncError}</div>
                  )}
                </div>
              )}

              <PlatformActions platform={platform} connected={connected} isDemo={account?.isDemo ?? false} />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
