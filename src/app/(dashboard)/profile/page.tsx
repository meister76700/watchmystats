import { redirect } from "next/navigation";
import { requireCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { PLATFORM_META } from "@/types/platform";
import { formatDate } from "@/lib/utils";

export default async function ProfilePage() {
  let userId: string;
  try {
    userId = await requireCurrentUserId();
  } catch {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { platformAccounts: true },
  });

  if (!user) redirect("/login");

  return (
    <div className="space-y-6 animate-fade-in max-w-xl">
      <div>
        <h1 className="text-xl font-semibold">Profil</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Tes informations personnelles.</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xl font-semibold">
            {user.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <div className="font-semibold">{user.name}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
        </div>

        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Membre depuis</dt>
            <dd>{formatDate(user.createdAt)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Plateformes connectées</dt>
            <dd>{user.platformAccounts.length}</dd>
          </div>
        </dl>
      </Card>

      {user.platformAccounts.length > 0 && (
        <Card className="p-6">
          <h2 className="font-medium text-sm mb-4">Comptes connectés</h2>
          <div className="space-y-3">
            {user.platformAccounts.map((account) => (
              <div key={account.id} className="flex items-center gap-3 text-sm">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-semibold text-white shrink-0"
                  style={{ backgroundColor: PLATFORM_META[account.platform].color }}
                >
                  {PLATFORM_META[account.platform].label[0]}
                </div>
                <div>
                  <div>{account.displayName ?? PLATFORM_META[account.platform].label}</div>
                  <div className="text-xs text-muted-foreground">{account.handle}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
