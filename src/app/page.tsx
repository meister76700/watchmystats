import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowRight,
  BarChart3,
  Sparkles,
  Link2,
  TrendingUp,
  Flame,
  Wallet,
  Youtube,
  Twitch,
  Instagram,
  Facebook,
} from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "Dashboard centralisé",
    desc: "Toutes tes statistiques YouTube, TikTok, Instagram, Twitch, Facebook et X réunies en un seul endroit.",
  },
  {
    icon: Flame,
    title: "Statistiques vidéo par vidéo",
    desc: "Vues, likes, commentaires, partages et rétention pour chaque contenu, sur toutes les plateformes.",
  },
  {
    icon: TrendingUp,
    title: "Graphiques de croissance",
    desc: "Visualise ton évolution sur 24h, 7j, 30j, 90j, 1 an ou une période personnalisée.",
  },
  {
    icon: Link2,
    title: "Connexion multi-plateformes",
    desc: "Connecte tous tes comptes en OAuth officiel, en toute sécurité, en quelques clics.",
  },
  {
    icon: Sparkles,
    title: "Performance Score",
    desc: "Un score sur 100 qui résume la performance réelle de chacun de tes contenus.",
  },
  {
    icon: Wallet,
    title: "Suivi des revenus",
    desc: "Centralise tes revenus estimés lorsque les plateformes les rendent disponibles via leur API.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <div className="h-7 w-7 rounded-lg bg-accent flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-accent-foreground" />
            </div>
            WatchMyStats
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#accueil" className="hover:text-foreground transition-colors">Accueil</a>
            <a href="#fonctionnalites" className="hover:text-foreground transition-colors">Fonctionnalités</a>
            <a href="#tarifs" className="hover:text-foreground transition-colors">Tarifs</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Connexion</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Commencer gratuitement</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="accueil" className="relative overflow-hidden bg-glow-gradient">
        <div className="container py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground mb-6 animate-fade-in">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> Nouveau — Performance Score alimenté par l'IA
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto animate-slide-up">
            Toutes tes statistiques.<br />
            <span className="text-accent">Un seul endroit.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto animate-slide-up">
            WatchMyStats centralise les performances de tes contenus sur YouTube, TikTok, Instagram,
            Twitch, Facebook et X — pour que tu n'aies plus jamais besoin d'ouvrir six applications.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 animate-slide-up">
            <Button size="lg" asChild>
              <Link href="/register">
                Commencer gratuitement <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/dashboard">Voir la démo</Link>
            </Button>
          </div>

          {/* Aperçu visuel du dashboard */}
          <div className="mt-16 mx-auto max-w-5xl">
            <Card className="p-6 text-left shadow-2xl shadow-accent/5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Vues totales", value: "4,82 M", change: "+12,4 %" },
                  { label: "Abonnés", value: "128 K", change: "+3,1 %" },
                  { label: "Likes", value: "312 K", change: "+8,7 %" },
                  { label: "Engagement", value: "6,4 %", change: "-1,2 %" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-muted p-4">
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                    <div className="text-xl font-semibold mt-1">{stat.value}</div>
                    <div className={stat.change.startsWith("+") ? "stat-pill-up mt-2 inline-block" : "stat-pill-down mt-2 inline-block"}>
                      {stat.change}
                    </div>
                  </div>
                ))}
              </div>
              <div className="h-40 rounded-xl bg-muted flex items-end gap-1.5 p-4">
                {[40, 55, 35, 70, 60, 85, 65, 90, 75, 95, 80, 100].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-md bg-accent/70" style={{ height: `${h}%` }} />
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Fonctionnalités */}
      <section id="fonctionnalites" className="container py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold">Tout ce qu'il te faut pour piloter ta croissance</h2>
          <p className="text-muted-foreground mt-3">Une seule plateforme pour comprendre et améliorer tes performances.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {features.map((f) => (
            <Card key={f.title} className="p-6 card-hover">
              <div className="h-10 w-10 rounded-xl bg-accent/15 flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-semibold mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Comparaison */}
      <section className="container py-24">
        <Card className="p-10 bg-glow-gradient text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Arrête de jongler entre six applications
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            Studio YouTube, TikTok Analytics, Instagram Insights, Twitch Dashboard, Meta Business
            Suite, X Analytics... WatchMyStats réunit tout ce dont tu as besoin, mis à jour
            automatiquement, comparable en un coup d'œil.
          </p>
          <div className="flex items-center justify-center gap-4 text-muted-foreground">
            <Youtube className="h-6 w-6" />
            <Instagram className="h-6 w-6" />
            <Twitch className="h-6 w-6" />
            <Facebook className="h-6 w-6" />
            <ArrowRight className="h-5 w-5 text-accent mx-2" />
            <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-accent-foreground" />
            </div>
          </div>
        </Card>
      </section>

      {/* Tarifs */}
      <section id="tarifs" className="container py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold">Tarifs simples et transparents</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <Card className="p-8">
            <h3 className="font-semibold text-lg">Gratuit</h3>
            <div className="text-3xl font-bold mt-2">0 €</div>
            <p className="text-sm text-muted-foreground mt-2 mb-6">2 plateformes connectées, historique 30 jours.</p>
            <Button className="w-full" variant="outline" asChild>
              <Link href="/register">Commencer</Link>
            </Button>
          </Card>
          <Card className="p-8 border-accent/40">
            <h3 className="font-semibold text-lg">Pro</h3>
            <div className="text-3xl font-bold mt-2">12 € <span className="text-sm font-normal text-muted-foreground">/mois</span></div>
            <p className="text-sm text-muted-foreground mt-2 mb-6">Toutes les plateformes, historique illimité, IA avancée.</p>
            <Button className="w-full" asChild>
              <Link href="/register">Essayer Pro</Link>
            </Button>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="container py-12 grid md:grid-cols-4 gap-8 text-sm">
          <div>
            <div className="font-semibold mb-3">WatchMyStats</div>
            <p className="text-muted-foreground">Toutes tes statistiques. Un seul endroit.</p>
          </div>
          <div>
            <div className="font-medium mb-3">Produit</div>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#fonctionnalites" className="hover:text-foreground">Fonctionnalités</a></li>
              <li><a href="#tarifs" className="hover:text-foreground">Tarifs</a></li>
            </ul>
          </div>
          <div>
            <div className="font-medium mb-3">Ressources</div>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">Documentation</a></li>
              <li><a href="#" className="hover:text-foreground">Contact</a></li>
            </ul>
          </div>
          <div>
            <div className="font-medium mb-3">Légal</div>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">Confidentialité</a></li>
              <li><a href="#" className="hover:text-foreground">Conditions</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
