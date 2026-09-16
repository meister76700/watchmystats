"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark");
  const [notifySyncSuccess, setNotifySyncSuccess] = useState(true);
  const [notifySyncError, setNotifySyncError] = useState(true);
  const [notifyWeeklyReport, setNotifyWeeklyReport] = useState(true);
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function saveAppearanceAndNotifications() {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme, notifySyncSuccess, notifySyncError, notifyWeeklyReport }),
    });
    setSaving(false);
    setMessage(res.ok ? { type: "success", text: "Préférences enregistrées." } : { type: "error", text: "Une erreur est survenue." });
  }

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const body: Record<string, string> = {};
    if (name) body.name = name;
    if (newPassword) {
      body.currentPassword = currentPassword;
      body.newPassword = newPassword;
    }
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setMessage({ type: "success", text: "Compte mis à jour." });
      setCurrentPassword("");
      setNewPassword("");
    } else {
      setMessage({ type: "error", text: data.error ?? "Une erreur est survenue." });
    }
  }

  async function handleDeleteAccount() {
    await fetch("/api/settings", { method: "DELETE" });
    signOut({ callbackUrl: "/" });
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-xl">
      <div>
        <h1 className="text-xl font-semibold">Paramètres</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gère ton compte et tes préférences.</p>
      </div>

      {message && (
        <p className={`text-sm ${message.type === "success" ? "text-success" : "text-danger"}`}>{message.text}</p>
      )}

      <Card className="p-5">
        <h2 className="font-medium text-sm mb-4">Apparence</h2>
        <div className="flex gap-2 mb-5">
          {(["dark", "light", "system"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`text-xs px-3 py-1.5 rounded-full border ${theme === t ? "bg-accent text-accent-foreground border-accent" : "border-border text-muted-foreground"}`}
            >
              {t === "dark" ? "Sombre" : t === "light" ? "Clair" : "Système"}
            </button>
          ))}
        </div>

        <h2 className="font-medium text-sm mb-3">Notifications</h2>
        <div className="space-y-2.5 mb-5">
          <ToggleRow label="Synchronisation terminée" checked={notifySyncSuccess} onChange={setNotifySyncSuccess} />
          <ToggleRow label="Erreur de synchronisation" checked={notifySyncError} onChange={setNotifySyncError} />
          <ToggleRow label="Rapport hebdomadaire" checked={notifyWeeklyReport} onChange={setNotifyWeeklyReport} />
        </div>

        <Button onClick={saveAppearanceAndNotifications} disabled={saving} size="sm">
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </Card>

      <Card className="p-5">
        <h2 className="font-medium text-sm mb-4">Compte</h2>
        <form onSubmit={saveAccount} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nom</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ton nouveau nom" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">Mot de passe actuel</Label>
            <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Requis pour changer le mot de passe" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">Nouveau mot de passe</Label>
            <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Laisser vide pour ne pas changer" />
          </div>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Enregistrement..." : "Mettre à jour"}
          </Button>
        </form>
      </Card>

      <Card className="p-5 border-danger/30">
        <h2 className="font-medium text-sm mb-2 text-danger">Zone de danger</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Supprimer ton compte effacera définitivement toutes tes données, connexions et statistiques.
        </p>
        {confirmDelete ? (
          <div className="flex gap-2">
            <Button variant="danger" size="sm" onClick={handleDeleteAccount}>Confirmer la suppression</Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>Annuler</Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)}>Supprimer mon compte</Button>
        )}
      </Card>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between text-sm cursor-pointer">
      <span className="text-muted-foreground">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-current" style={{ accentColor: "hsl(255 85% 65%)" }} />
    </label>
  );
}
