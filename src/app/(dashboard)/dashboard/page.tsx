import { redirect } from "next/navigation";
import Link from "next/link";
import { Eye, Users, Heart, MessageCircle } from "lucide-react";
import { requireCurrentUserId } from "@/lib/auth/session";
import { getGlobalStats } from "@/services/analytics/dashboard-stats";
import { StatCard } from "@/components/dashboard/stat-card";
import { MainChart } from "@/components/charts/main-chart";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { timeAgo } from "@/lib/utils";

export default async function DashboardPage() {
  let userId: string;
  try {
    userId = await requireCurrentUserId();
  } catch {
    redirect("/login");
  }

  const [stats, accounts, user] = await Promise.all([
    getGlobalStats(userId, "30d"),
    prisma.platformAccount.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);

  const hasNoAccounts = accounts.length === 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            Bonjour, {user?.name ?? "Créateur"}
            {user?.isDemoAccount && (
              <span className="ml-2 align-middle text-xs text-accent bg-accent/15 border border-accent/25 rounded-full px-2.5 py-0.5">
                ● Demo Data
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Voici un aperçu de tes performances sur les 30 derniers jours.
          </p>
        </div>
      </div>

      {hasNoAccounts ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">
            Tu n&apos;as encore connecté aucune plateforme. Connecte un compte pour voir tes vraies statistiques.
          </p>
          <Link href="/platforms" className="text-accent hover:underline text-sm font-medium">
            Connecter une plateforme →
          </Link>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Vues" value={stats.totalViews} changePercent={stats.viewsChangePercent} icon={Eye} />
            <StatCard label="Abonnés" value={stats.totalFollowers} changePercent={stats.followersChangePercent} icon={Users} />
            <StatCard label="Likes" value={stats.totalLikes} changePercent={stats.likesChangePercent} icon={Heart} />
            <StatCard label="Commentaires" value={stats.totalComments} changePercent={stats.commentsChangePercent} icon={MessageCircle} />
          </div>

          <MainChart />

          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Comptes connectés</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {accounts.map((account) => (
                <Card key={account.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{account.displayName ?? account.platform}</span>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        account.lastSyncStatus === "SUCCESS"
                          ? "bg-success"
                          : account.lastSyncStatus === "ERROR"
                          ? "bg-danger"
                          : "bg-muted-foreground"
                      }`}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {account.lastSyncAt ? `Synchronisé ${timeAgo(account.lastSyncAt)}` : "Jamais synchronisé"}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
