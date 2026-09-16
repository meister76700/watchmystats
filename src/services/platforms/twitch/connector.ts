import type {
  PlatformConnector,
  NormalizedAccountStats,
  NormalizedVideoStats,
  OAuthTokenSet,
} from "@/types/platform";
import { PLATFORM_META } from "@/types/platform";

// ============================================================================
// Connecteur Twitch — Twitch API officielle (OAuth 2.0 + Helix API).
// Même contrat que YouTube (voir services/platforms/youtube/connector.ts).
//
// Endpoints officiels:
// - Autorisation: https://id.twitch.tv/oauth2/authorize
// - Token:        https://id.twitch.tv/oauth2/token
// - Utilisateur:  https://api.twitch.tv/helix/users
// - Vidéos (VOD): https://api.twitch.tv/helix/videos
//
// L'Analytics API de revenus (Extension/Game Analytics) nécessite un scope
// dédié non couvert par un simple compte créateur → fetchRevenue renvoie null.
// ============================================================================

const AUTH_URL = "https://id.twitch.tv/oauth2/authorize";
const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const API_BASE = "https://api.twitch.tv/helix";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable d'environnement manquante: ${name}`);
  return value;
}

async function helixHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Client-Id": getEnv("TWITCH_CLIENT_ID"),
  };
}

export const twitchConnector: PlatformConnector = {
  key: "TWITCH",

  getAuthorizeUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: getEnv("TWITCH_CLIENT_ID"),
      redirect_uri: getEnv("TWITCH_REDIRECT_URI"),
      response_type: "code",
      scope: PLATFORM_META.TWITCH.scopes.join(" "),
      state,
    });
    return `${AUTH_URL}?${params.toString()}`;
  },

  async exchangeCodeForToken(code: string): Promise<OAuthTokenSet> {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: getEnv("TWITCH_CLIENT_ID"),
        client_secret: getEnv("TWITCH_CLIENT_SECRET"),
        code,
        grant_type: "authorization_code",
        redirect_uri: getEnv("TWITCH_REDIRECT_URI"),
      }),
    });
    if (!res.ok) throw new Error(`Échec de l'échange du code Twitch: ${res.status}`);
    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope?.join(" ") ?? null,
    };
  },

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenSet> {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: getEnv("TWITCH_CLIENT_ID"),
        client_secret: getEnv("TWITCH_CLIENT_SECRET"),
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    if (!res.ok) throw new Error(`Échec du renouvellement du token Twitch: ${res.status}`);
    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope?.join(" ") ?? null,
    };
  },

  async fetchAccountStats(accessToken: string): Promise<NormalizedAccountStats> {
    const res = await fetch(`${API_BASE}/users`, { headers: await helixHeaders(accessToken) });
    if (!res.ok) throw new Error(`Échec de récupération du profil Twitch: ${res.status}`);
    const data = await res.json();
    const user = data.data?.[0];
    if (!user) throw new Error("Aucun profil Twitch trouvé pour ce compte.");

    // Le nombre de followers nécessite un second appel à /channels/followers
    const followersRes = await fetch(`${API_BASE}/channels/followers?broadcaster_id=${user.id}`, {
      headers: await helixHeaders(accessToken),
    });
    const followersData = followersRes.ok ? await followersRes.json() : { total: 0 };

    return {
      externalAccountId: user.id,
      displayName: user.display_name ?? null,
      handle: user.login ? `@${user.login}` : null,
      avatarUrl: user.profile_image_url ?? null,
      followerCount: followersData.total ?? 0,
      viewCount: user.view_count ?? null,
    };
  },

  async fetchVideos(accessToken: string, since?: Date): Promise<NormalizedVideoStats[]> {
    const userRes = await fetch(`${API_BASE}/users`, { headers: await helixHeaders(accessToken) });
    const userData = await userRes.json();
    const userId = userData.data?.[0]?.id;
    if (!userId) return [];

    const res = await fetch(`${API_BASE}/videos?user_id=${userId}&first=20`, {
      headers: await helixHeaders(accessToken),
    });
    if (!res.ok) throw new Error(`Échec de récupération des VOD Twitch: ${res.status}`);
    const data = await res.json();

    return (data.data ?? [])
      .map((v: {
        id: string; title: string; thumbnail_url: string; url: string;
        created_at: string; view_count: number;
      }) => ({
        externalId: v.id,
        title: v.title,
        thumbnailUrl: v.thumbnail_url?.replace("%{width}", "320").replace("%{height}", "180") ?? null,
        url: v.url ?? null,
        contentType: "LIVE" as const,
        publishedAt: v.created_at ? new Date(v.created_at) : null,
        views: v.view_count ?? 0,
        likes: 0, // non exposé par l'API Helix pour les VOD
        comments: 0,
        shares: null,
        avgViewDuration: null,
        retentionRate: null,
      }))
      .filter((v: NormalizedVideoStats) => !since || !v.publishedAt || v.publishedAt >= since);
  },

  async fetchRevenue() {
    // Les revenus (Bits, abonnements) nécessitent l'Extensions/Bits API et
    // une relation de paiement approuvée par Twitch → non disponible par
    // défaut dans cette intégration.
    return null;
  },
};
