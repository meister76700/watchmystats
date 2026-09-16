import type {
  PlatformConnector,
  NormalizedAccountStats,
  NormalizedVideoStats,
  OAuthTokenSet,
} from "@/types/platform";
import { PLATFORM_META } from "@/types/platform";

// ============================================================================
// Connecteur Instagram — Meta Graph API (Instagram Business Login).
// Même contrat que YouTube (voir services/platforms/youtube/connector.ts).
//
// Endpoints officiels:
// - Autorisation: https://www.facebook.com/v19.0/dialog/oauth
// - Token:        https://graph.facebook.com/v19.0/oauth/access_token
// - Compte:       https://graph.facebook.com/v19.0/me/accounts (page + IG business account lié)
// - Médias:       https://graph.facebook.com/v19.0/{ig-user-id}/media
// - Insights:     https://graph.facebook.com/v19.0/{media-id}/insights
//
// Les revenus ne sont pas exposés par l'API Instagram Graph → fetchRevenue
// renvoie null.
// ============================================================================

const AUTH_URL = "https://www.facebook.com/v19.0/dialog/oauth";
const TOKEN_URL = "https://graph.facebook.com/v19.0/oauth/access_token";
const API_BASE = "https://graph.facebook.com/v19.0";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable d'environnement manquante: ${name}`);
  return value;
}

export const instagramConnector: PlatformConnector = {
  key: "INSTAGRAM",

  getAuthorizeUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: getEnv("INSTAGRAM_CLIENT_ID"),
      redirect_uri: getEnv("INSTAGRAM_REDIRECT_URI"),
      response_type: "code",
      scope: PLATFORM_META.INSTAGRAM.scopes.join(","),
      state,
    });
    return `${AUTH_URL}?${params.toString()}`;
  },

  async exchangeCodeForToken(code: string): Promise<OAuthTokenSet> {
    const params = new URLSearchParams({
      client_id: getEnv("INSTAGRAM_CLIENT_ID"),
      client_secret: getEnv("INSTAGRAM_CLIENT_SECRET"),
      redirect_uri: getEnv("INSTAGRAM_REDIRECT_URI"),
      code,
    });
    const res = await fetch(`${TOKEN_URL}?${params.toString()}`);
    if (!res.ok) throw new Error(`Échec de l'échange du code Instagram: ${res.status}`);
    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: null, // Meta utilise un long-lived token plutôt qu'un refresh_token classique
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
      scope: null,
    };
  },

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenSet> {
    // Meta: échange d'un token court en long-lived token (60 jours).
    const params = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: getEnv("INSTAGRAM_CLIENT_ID"),
      client_secret: getEnv("INSTAGRAM_CLIENT_SECRET"),
      fb_exchange_token: refreshToken,
    });
    const res = await fetch(`${TOKEN_URL}?${params.toString()}`);
    if (!res.ok) throw new Error(`Échec du renouvellement du token Instagram: ${res.status}`);
    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
      scope: null,
    };
  },

  async fetchAccountStats(accessToken: string): Promise<NormalizedAccountStats> {
    const res = await fetch(
      `${API_BASE}/me?fields=id,username,profile_picture_url,followers_count&access_token=${accessToken}`
    );
    if (!res.ok) throw new Error(`Échec de récupération du profil Instagram: ${res.status}`);
    const data = await res.json();

    return {
      externalAccountId: data.id,
      displayName: data.username ?? null,
      handle: data.username ? `@${data.username}` : null,
      avatarUrl: data.profile_picture_url ?? null,
      followerCount: data.followers_count ?? 0,
      viewCount: null,
    };
  },

  async fetchVideos(accessToken: string, since?: Date): Promise<NormalizedVideoStats[]> {
    const res = await fetch(
      `${API_BASE}/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&access_token=${accessToken}`
    );
    if (!res.ok) throw new Error(`Échec de récupération des médias Instagram: ${res.status}`);
    const data = await res.json();

    return (data.data ?? [])
      .filter((m: { media_type: string }) => ["VIDEO", "REELS"].includes(m.media_type))
      .map((m: {
        id: string; caption?: string; media_type: string; thumbnail_url?: string;
        media_url?: string; permalink?: string; timestamp?: string;
        like_count?: number; comments_count?: number;
      }) => ({
        externalId: m.id,
        title: m.caption?.slice(0, 100) ?? "Sans légende",
        thumbnailUrl: m.thumbnail_url ?? m.media_url ?? null,
        url: m.permalink ?? null,
        contentType: m.media_type === "REELS" ? ("REEL" as const) : ("VIDEO" as const),
        publishedAt: m.timestamp ? new Date(m.timestamp) : null,
        views: 0, // nécessite un appel /insights séparé par média (metric=plays)
        likes: m.like_count ?? 0,
        comments: m.comments_count ?? 0,
        shares: null, // non fourni par l'API Basic Display / Graph media fields
        avgViewDuration: null,
        retentionRate: null,
      }))
      .filter((v: NormalizedVideoStats) => !since || !v.publishedAt || v.publishedAt >= since);
  },

  async fetchRevenue() {
    // L'API Instagram Graph ne fournit aucune donnée de revenus créateur.
    return null;
  },
};
