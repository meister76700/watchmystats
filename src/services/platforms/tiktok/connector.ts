import type {
  PlatformConnector,
  NormalizedAccountStats,
  NormalizedVideoStats,
  OAuthTokenSet,
} from "@/types/platform";
import { PLATFORM_META } from "@/types/platform";

// ============================================================================
// Connecteur TikTok — TikTok for Developers (Login Kit + Display API).
// Suit le même contrat PlatformConnector que YouTube (voir
// services/platforms/youtube/connector.ts pour la référence détaillée).
//
// Endpoints officiels utilisés:
// - Autorisation:  https://www.tiktok.com/v2/auth/authorize
// - Token:         https://open.tiktokapis.com/v2/oauth/token/
// - Infos user:    https://open.tiktokapis.com/v2/user/info/
// - Liste vidéos:  https://open.tiktokapis.com/v2/video/list/
//
// L'API Display TikTok ne fournit pas de données de revenus (TikTok Creator
// Fund n'expose aucune API publique de revenus) → fetchRevenue renvoie null.
// ============================================================================

const AUTH_URL = "https://www.tiktok.com/v2/auth/authorize";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const API_BASE = "https://open.tiktokapis.com/v2";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable d'environnement manquante: ${name}`);
  return value;
}

export const tiktokConnector: PlatformConnector = {
  key: "TIKTOK",

  getAuthorizeUrl(state: string): string {
    const params = new URLSearchParams({
      client_key: getEnv("TIKTOK_CLIENT_KEY"),
      redirect_uri: getEnv("TIKTOK_REDIRECT_URI"),
      response_type: "code",
      scope: PLATFORM_META.TIKTOK.scopes.join(","),
      state,
    });
    return `${AUTH_URL}?${params.toString()}`;
  },

  async exchangeCodeForToken(code: string): Promise<OAuthTokenSet> {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: getEnv("TIKTOK_CLIENT_KEY"),
        client_secret: getEnv("TIKTOK_CLIENT_SECRET"),
        code,
        grant_type: "authorization_code",
        redirect_uri: getEnv("TIKTOK_REDIRECT_URI"),
      }),
    });
    if (!res.ok) throw new Error(`Échec de l'échange du code TikTok: ${res.status}`);
    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope ?? null,
    };
  },

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenSet> {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: getEnv("TIKTOK_CLIENT_KEY"),
        client_secret: getEnv("TIKTOK_CLIENT_SECRET"),
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    if (!res.ok) throw new Error(`Échec du renouvellement du token TikTok: ${res.status}`);
    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope ?? null,
    };
  },

  async fetchAccountStats(accessToken: string): Promise<NormalizedAccountStats> {
    const res = await fetch(
      `${API_BASE}/user/info/?fields=open_id,display_name,avatar_url,follower_count,likes_count`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) throw new Error(`Échec de récupération du profil TikTok: ${res.status}`);
    const data = await res.json();
    const user = data.data?.user;
    if (!user) throw new Error("Aucun profil TikTok trouvé pour ce compte.");

    return {
      externalAccountId: user.open_id,
      displayName: user.display_name ?? null,
      handle: null,
      avatarUrl: user.avatar_url ?? null,
      followerCount: user.follower_count ?? 0,
      viewCount: null, // non exposé au niveau compte par l'API Display
    };
  },

  async fetchVideos(accessToken: string, since?: Date): Promise<NormalizedVideoStats[]> {
    const res = await fetch(`${API_BASE}/video/list/?fields=id,title,cover_image_url,share_url,create_time,view_count,like_count,comment_count,share_count`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ max_count: 20 }),
    });
    if (!res.ok) throw new Error(`Échec de récupération des vidéos TikTok: ${res.status}`);
    const data = await res.json();

    return (data.data?.videos ?? [])
      .map((v: {
        id: string; title: string; cover_image_url: string; share_url: string;
        create_time: number; view_count: number; like_count: number;
        comment_count: number; share_count: number;
      }) => ({
        externalId: v.id,
        title: v.title ?? "Sans titre",
        thumbnailUrl: v.cover_image_url ?? null,
        url: v.share_url ?? null,
        contentType: "VIDEO" as const,
        publishedAt: v.create_time ? new Date(v.create_time * 1000) : null,
        views: v.view_count ?? 0,
        likes: v.like_count ?? 0,
        comments: v.comment_count ?? 0,
        shares: v.share_count ?? null,
        avgViewDuration: null, // non fourni par la Display API publique
        retentionRate: null,
      }))
      .filter((v: NormalizedVideoStats) => !since || !v.publishedAt || v.publishedAt >= since);
  },

  async fetchRevenue() {
    // TikTok ne fournit aucune API publique de revenus créateur (Creator
    // Fund / Creativity Program). Non disponible par design.
    return null;
  },
};
