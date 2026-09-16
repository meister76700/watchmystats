"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Clapperboard,
  LineChart,
  Globe,
  Wallet,
  Sparkles,
  Settings,
  BarChart3,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/videos", label: "Mes vidéos", icon: Clapperboard },
  { href: "/analytics", label: "Analytics", icon: LineChart },
  { href: "/platforms", label: "Plateformes", icon: Globe },
  { href: "/revenue", label: "Revenus", icon: Wallet },
  { href: "/ai", label: "WatchMyStats AI", icon: Sparkles },
  { href: "/settings", label: "Paramètres", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col border-r border-border h-screen sticky top-0 shrink-0">
      <div className="h-16 flex items-center gap-2 px-5 font-semibold border-b border-border">
        <div className="h-7 w-7 rounded-lg bg-accent flex items-center justify-center">
          <BarChart3 className="h-4 w-4 text-accent-foreground" />
        </div>
        WatchMyStats
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-accent/15 text-accent font-medium"
                  : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md">
      <div className="flex items-center justify-around py-2">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg text-[10px]",
                active ? "text-accent" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
