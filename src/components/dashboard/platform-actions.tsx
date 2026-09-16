"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { PlatformKey } from "@/types/platform";

export function PlatformActions({
  platform,
  connected,
  isDemo,
}: {
  platform: PlatformKey;
  connected: boolean;
  isDemo: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDisconnect() {
    setLoading(true);
    try {
      await fetch("/api/platforms/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (isDemo) {
    return (
      <p className="mt-4 text-xs text-muted-foreground">
        Compte de démonstration — connecte un vrai compte pour remplacer ces données.
      </p>
    );
  }

  return (
    <div className="mt-4 flex gap-2">
      {connected ? (
        <>
          <Button size="sm" variant="outline" asChild>
            <a href={`/api/platforms/${platform.toLowerCase()}/connect`}>Reconnecter</a>
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDisconnect} disabled={loading}>
            {loading ? "..." : "Déconnecter"}
          </Button>
        </>
      ) : (
        <Button size="sm" asChild>
          <a href={`/api/platforms/${platform.toLowerCase()}/connect`}>Connecter</a>
        </Button>
      )}
    </div>
  );
}
