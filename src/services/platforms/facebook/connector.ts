import type {
  PlatformConnector,
  NormalizedAccountStats,
  NormalizedVideoStats,
  OAuthTokenSet,
} from "@/types/platform";
import { PLATFORM_META } from "@/types/platform";

// ============================================================================
// Connecteur Facebook — Meta Graph API (Facebook Login for Business).
// Même contrat que YouTube (voir services/platforms/youtube/connector.ts).
// Partage la même famille d'API que Instagram (Meta Graph API).
// ============================================================================

const AUTH_URL = "https://www.facebook.com/v19.0/dialog/oauth";
const TOKEN_URL = "https://graph.facebook.com/v19.0/oauth/access_token";
const API_BASE = "https://graph.facebook.com/v19.0";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable d'environnement manquante: ${name}`);
  return value;
}

export const facebookConnector: PlatformConnector = {
  key: "FACEBOOK",

  getAuthorizeUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: getEnv("FACEBOOK_CLIENT_ID"),
      redirect_uri: getEnv("FACEBOOK_REDIRECT_URI"),
      response_type: "code",
      scope: PLATFORM_META.FACEBOOK.scopes.join(","),
      state,
    });
    return `${AUTH_URL}?${params.toString()}`;
  },

  async exchangeCodeForToken(code: string): Promise<OAuthTokenSet> {
    const params = new URLSearchParams({
      client_id: getEnv("FACEBOOK_CLIENT_ID"),
      client_secret: getEnv("FACEBOOK_CLIENT_SECRET"),
      redirect_uri: getEnv("FACEBOOK_REDIRECT_URI"),
      code,
    });
    const res = await fetch(`${TOKEN_URL}?${params.toString()}`);
    if (!res.ok) throw new Error(`Échec de l'échange du code Facebook: ${res.status}`);
    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: null,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
      scope: null,
    };
  },

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenSet> {
    const params = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: getEnv("FACEBOOK_CLIENT_ID"),
      client_secret: getEnv("FACEBOOK_CLIENT_SECRET"),
      fb_exchange_token: refreshToken,
    });
    const res = await fetch(`${TOKEN_URL}?${params.toString()}`);
    if (!res.ok) throw new Error(`Échec du renouvellement du token Facebook: ${res.status}`);
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
      `${API_BASE}/me/accounts?fields=id,name,picture,followers_count&access_token=${accessToken}`
    );
    if (!res.ok) throw new Error(`Échec de récupération de la page Facebook: ${res.status}`);
    const data = await res.json();
    const page = data.data?.[0];
    if (!page) throw new Error("Aucune page Facebook trouvée pour ce compte.");

    return {
      externalAccountId: page.id,
      displayName: page.name ?? null,
      handle: null,
      avatarUrl: page.picture?.data?.url ?? null,
      followerCount: page.followers_count ?? 0,
      viewCount: null,
    };
  },

  async fetchVideos(accessToken: string, since?: Date): Promise<NormalizedVideoStats[]> {
    const pagesRes = await fetch(`${API_BASE}/me/accounts?access_token=${accessToken}`);
    const pagesData = await pagesRes.json();
    const page = pagesData.data?.[0];
    if (!page) return [];

    const res = await fetch(
      `${API_BASE}/${page.id}/videos?fields=id,title,description,picture,permalink_url,created_time,views,likes.summary(true),comments.summary(true)&access_token=${page.access_token ?? accessToken}`
    );
    if (!res.ok) throw new Error(`Échec de récupération des vidéos Facebook: ${res.status}`);
    const data = await res.json();

    return (data.data ?? [])
      .map((v: {
        id: string; title?: string; description?: string; picture?: string;
        permalink_url?: string; created_time?: string; views?: number;
        likes?: { summary?: { total_count?: number } };
        comments?: { summary?: { total_count?: number } };
      }) => ({
        externalId: v.id,
        title: v.title ?? v.description?.slice(0, 100) ?? "Sans titre",
        thumbnailUrl: v.picture ?? null,
        url: v.permalink_url ? `https://facebook.com${v.permalink_url}` : null,
        contentType: "VIDEO" as const,
        publishedAt: v.created_time ? new Date(v.created_time) : null,
        views: v.views ?? 0,
        likes: v.likes?.summary?.total_count ?? 0,
        comments: v.comments?.summary?.total_count ?? 0,
        shares: null, // nécessite un appel /insights séparé (metric=post_shares)
        avgViewDuration: null,
        retentionRate: null,
      }))
      .filter((v: NormalizedVideoStats) => !since || !v.publishedAt || v.publishedAt >= since);
  },

  async fetchRevenue() {
    // Nécessite l'accès à la Monetization API de Meta, réservée aux pages
    // éligibles au programme de monétisation → non disponible par défaut.
    return null;
  },
};
