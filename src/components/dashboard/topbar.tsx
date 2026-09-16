"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Search, Bell, RefreshCw, LogOut, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function Topbar() {
  const { data: session } = useSession();
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      await fetch("/api/sync", { method: "POST" });
      router.refresh();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <header className="h-16 border-b border-border flex items-center gap-4 px-4 md:px-6 sticky top-0 bg-background/90 backdrop-blur-md z-40">
      <div className="relative flex-1 max-w-sm hidden sm:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher une vidéo, une plateforme..." className="pl-9" />
      </div>

      <div className="flex-1 sm:hidden" />

      <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
        <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
        <span className="hidden sm:inline">{syncing ? "Synchronisation..." : "Synchroniser"}</span>
      </Button>

      <button className="relative h-9 w-9 rounded-xl hover:bg-surface-hover flex items-center justify-center">
        <Bell className="h-4 w-4 text-muted-foreground" />
        <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-accent" />
      </button>

      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="h-9 w-9 rounded-full bg-accent/20 flex items-center justify-center text-sm font-medium text-accent"
        >
          {session?.user?.name?.[0]?.toUpperCase() ?? <User className="h-4 w-4" />}
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-11 w-48 card p-1.5 shadow-xl">
            <a href="/profile" className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-surface-hover">
              <User className="h-4 w-4" /> Profil
            </a>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-surface-hover text-danger"
            >
              <LogOut className="h-4 w-4" /> Déconnexion
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
