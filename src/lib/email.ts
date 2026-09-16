// ============================================================================
// Envoi d'emails transactionnels via Resend.
// Si RESEND_API_KEY n'est pas configurée (ex: environnement de développement
// local sans clé), le lien est simplement affiché dans les logs serveur pour
// permettre de tester le flux sans dépendance externe.
// ============================================================================

export async function sendPasswordResetEmail(to: string, token: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

  if (!process.env.RESEND_API_KEY) {
    console.log(`[dev] Email de réinitialisation pour ${to}: ${resetUrl}`);
    return;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "WatchMyStats <no-reply@watchmystats.app>",
    to,
    subject: "Réinitialise ton mot de passe WatchMyStats",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Réinitialisation de mot de passe</h2>
        <p>Tu as demandé à réinitialiser ton mot de passe WatchMyStats.</p>
        <p><a href="${resetUrl}" style="background:#7C6CF5;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Réinitialiser mon mot de passe</a></p>
        <p>Ce lien expire dans 1 heure. Si tu n'es pas à l'origine de cette demande, ignore cet email.</p>
      </div>
    `,
  });
}

export async function sendWeeklyReportEmail(to: string, summaryHtml: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[dev] Rapport hebdomadaire pour ${to} (non envoyé, RESEND_API_KEY absente)`);
    return;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "WatchMyStats <no-reply@watchmystats.app>",
    to,
    subject: "Ton rapport hebdomadaire WatchMyStats",
    html: summaryHtml,
  });
}
