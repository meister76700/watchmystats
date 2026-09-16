import { NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { getConnector } from "@/services/platforms/registry";
import { cookies } from "next/headers";

// ============================================================================
// Démarre le flux OAuth YouTube : génère un "state" anti-CSRF, le stocke dans
// un cookie signé côté serveur, puis redirige vers l'écran de consentement
// Google. Le state est vérifié dans /callback pour s'assurer que la réponse
// provient bien de cette même session (protection CSRF standard en OAuth 2.0).
// ============================================================================

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL));

  const state = crypto.randomBytes(24).toString("hex");
  cookies().set("oauth_state_youtube", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
  });

  try {
    const connector = getConnector("YOUTUBE");
    const authorizeUrl = connector.getAuthorizeUrl(state);
    return NextResponse.redirect(authorizeUrl);
  } catch {
    // Variables d'environnement YouTube non configurées.
    return NextResponse.redirect(
      new URL("/platforms?error=youtube_not_configured", process.env.NEXTAUTH_URL)
    );
  }
}
