"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-glow-gradient px-4">
      <Card className="w-full max-w-sm p-8">
        <Link href="/" className="flex items-center gap-2 font-semibold mb-8 justify-center">
          <div className="h-7 w-7 rounded-lg bg-accent flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-accent-foreground" />
          </div>
          WatchMyStats
        </Link>

        {sent ? (
          <div className="text-center">
            <h1 className="text-xl font-semibold mb-2">Vérifie ta boîte mail</h1>
            <p className="text-sm text-muted-foreground">
              Si un compte existe avec cette adresse, un lien de réinitialisation vient d'être envoyé.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-center mb-1">Mot de passe oublié</h1>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Reçois un lien pour réinitialiser ton mot de passe.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="toi@exemple.com"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Envoi..." : "Envoyer le lien"}
              </Button>
            </form>
          </>
        )}

        <p className="text-sm text-muted-foreground text-center mt-6">
          <Link href="/login" className="text-accent hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </Card>
    </div>
  );
}
