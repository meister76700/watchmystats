import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { getConnector } from "@/services/platforms/registry";
import { prisma } from "@/lib/prisma";
import { encryptToken } from "@/lib/crypto";
import { syncPlatformAccount } from "@/services/sync/sync-service";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL));

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expectedState = cookies().get("oauth_state_youtube")?.value;

  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(
      new URL("/platforms?error=youtube_invalid_state", process.env.NEXTAUTH_URL)
    );
  }
  cookies().delete("oauth_state_youtube");

  try {
    const connector = getConnector("YOUTUBE");
    const tokens = await connector.exchangeCodeForToken(code);
    const accountStats = await connector.fetchAccountStats(tokens.accessToken);

    const platformAccount = await prisma.platformAccount.upsert({
      where: {
        userId_platform_externalAccountId: {
          userId,
          platform: "YOUTUBE",
          externalAccountId: accountStats.externalAccountId,
        },
      },
      create: {
        userId,
        platform: "YOUTUBE",
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

    // Première synchronisation immédiate pour ne pas laisser un compte vide.
    await syncPlatformAccount(platformAccount.id, "INITIAL_CONNECT");

    return NextResponse.redirect(new URL("/platforms?connected=youtube", process.env.NEXTAUTH_URL));
  } catch (error) {
    console.error("Erreur callback YouTube:", error);
    return NextResponse.redirect(new URL("/platforms?error=youtube_failed", process.env.NEXTAUTH_URL));
  }
}
