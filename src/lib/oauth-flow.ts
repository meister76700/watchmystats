import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { getConnector } from "@/services/platforms/registry";
import { prisma } from "@/lib/prisma";
import { encryptToken } from "@/lib/crypto";
import { syncPlatformAccount } from "@/services/sync/sync-service";
import type { PlatformKey } from "@/types/platform";

// ============================================================================
// Logique OAuth partagée par toutes les routes /api/platforms/<plateforme>.
// Chaque plateforme a ses propres routes connect/callback (car les URLs de
// redirection OAuth doivent être enregistrées précisément côté fournisseur),
// mais elles délèguent toutes à ces deux fonctions communes.
// ============================================================================

export async function startOAuthFlow(platform: PlatformKey) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL));

  const state = crypto.randomBytes(24).toString("hex");
  cookies().set(`oauth_state_${platform.toLowerCase()}`, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
  });

  try {
    const connector = getConnector(platform);
    return NextResponse.redirect(connector.getAuthorizeUrl(state));
  } catch {
    return NextResponse.redirect(
      new URL(`/platforms?error=${platform.toLowerCase()}_not_configured`, process.env.NEXTAUTH_URL)
    );
  }
}

export async function completeOAuthFlow(platform: PlatformKey, req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL));

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieName = `oauth_state_${platform.toLowerCase()}`;
  const expectedState = cookies().get(cookieName)?.value;

  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(
      new URL(`/platforms?error=${platform.toLowerCase()}_invalid_state`, process.env.NEXTAUTH_URL)
    );
  }
  cookies().delete(cookieName);

  try {
    const connector = getConnector(platform);
    const tokens = await connector.exchangeCodeForToken(code);
    const accountStats = await connector.fetchAccountStats(tokens.accessToken);

    const platformAccount = await prisma.platformAccount.upsert({
      where: {
        userId_platform_externalAccountId: {
          userId,
          platform,
          externalAccountId: accountStats.externalAccountId,
        },
      },
      create: {
        userId,
        platform,
        externalAccountId: accountStats.externalAccountId,
        displayName: accountStats.displayName,
        handle: accountStats.handle,
        avatarUrl: accountStats.avatarUrl,
        followerCount: accountStats.followerCount,
        accessTokenEnc: encryptToken(tokens.accessToken),
        refreshTokenEnc: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
        tokenExpiresAt: tokens.expiresAt,
        scope: tokens.scope,
      },
      update: {
        displayName: accountStats.displayName,
        handle: accountStats.handle,
        avatarUrl: accountStats.avatarUrl,
        accessTokenEnc: encryptToken(tokens.accessToken),
        refreshTokenEnc: tokens.refreshToken ? encryptToken(tokens.refreshToken) : undefined,
        tokenExpiresAt: tokens.expiresAt,
        isActive: true,
      },
    });

    await syncPlatformAccount(platformAccount.id, "INITIAL_CONNECT");

    return NextResponse.redirect(
      new URL(`/platforms?connected=${platform.toLowerCase()}`, process.env.NEXTAUTH_URL)
    );
  } catch (error) {
    console.error(`Erreur callback ${platform}:`, error);
    return NextResponse.redirect(
      new URL(`/platforms?error=${platform.toLowerCase()}_failed`, process.env.NEXTAUTH_URL)
    );
  }
}
