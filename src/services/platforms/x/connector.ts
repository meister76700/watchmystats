import type {
  PlatformConnector,
  NormalizedAccountStats,
  NormalizedVideoStats,
  OAuthTokenSet,
} from "@/types/platform";
import { PLATFORM_META } from "@/types/platform";

// ============================================================================
// Connecteur X (ex-Twitter) — X API v2, OAuth 2.0 avec PKCE.
// Même contrat que YouTube (voir services/platforms/youtube/connector.ts).
//
// Endpoints officiels:
// - Autorisation: https://twitter.com/i/oauth2/authorize
// - Token:        https://api.x.com/2/oauth2/token
// - Utilisateur:  https://api.x.com/2/users/me
// - Tweets:       https://api.x.com/2/users/{id}/tweets
//
// Le niveau d'accès gratuit de l'API X est très limité en volume de
// requêtes — la synchronisation doit prévoir une gestion des erreurs 429.
// ============================================================================

const AUTH_URL = "https://twitter.com/i/oauth2/authorize";
const TOKEN_URL = "https://api.x.com/2/oauth2/token";
const API_BASE = "https://api.x.com/2";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable d'environnement manquante: ${name}`);
  return value;
}

export const xConnector: PlatformConnector = {
  key: "X",

  getAuthorizeUrl(state: string): string {
    // NOTE: OAuth 2.0 PKCE nécessite un code_verifier/code_challenge généré
    // et stocké côté serveur (session) avant l'appel — omis ici par souci de
    // concision, voir la documentation officielle liée dans PLATFORM_META.X.docsUrl.
    const params = new URLSearchParams({
      client_id: getEnv("X_CLIENT_ID"),
      redirect_uri: getEnv("X_REDIRECT_URI"),
      response_type: "code",
      scope: PLATFORM_META.X.scopes.join(" "),
      state,
      code_challenge: "challenge",
      code_challenge_method: "plain",
    });
    return `${AUTH_URL}?${params.toString()}`;
  },

  async exchangeCodeForToken(code: string): Promise<OAuthTokenSet> {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${getEnv("X_CLIENT_ID")}:${getEnv("X_CLIENT_SECRET")}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        client_id: getEnv("X_CLIENT_ID"),
        redirect_uri: getEnv("X_REDIRECT_URI"),
        code_verifier: "challenge",
      }),
    });
    if (!res.ok) throw new Error(`Échec de l'échange du code X: ${res.status}`);
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
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${getEnv("X_CLIENT_ID")}:${getEnv("X_CLIENT_SECRET")}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: getEnv("X_CLIENT_ID"),
      }),
    });
    if (!res.ok) throw new Error(`Échec du renouvellement du token X: ${res.status}`);
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
      `${API_BASE}/users/me?user.fields=profile_image_url,public_metrics,username`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) throw new Error(`Échec de récupération du profil X: ${res.status}`);
    const data = await res.json();
    const user = data.data;
    if (!user) throw new Error("Aucun profil X trouvé pour ce compte.");

    return {
      externalAccountId: user.id,
      displayName: user.name ?? null,
      handle: user.username ? `@${user.username}` : null,
      avatarUrl: user.profile_image_url ?? null,
      followerCount: user.public_metrics?.followers_count ?? 0,
      viewCount: null,
    };
  },

  async fetchVideos(accessToken: string, since?: Date): Promise<NormalizedVideoStats[]> {
    const meRes = await fetch(`${API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const meData = await meRes.json();
    const userId = meData.data?.id;
    if (!userId) return [];

    const res = await fetch(
      `${API_BASE}/users/${userId}/tweets?max_results=20&tweet.fields=created_at,public_metrics,attachments&expansions=attachments.media_keys&media.fields=preview_image_url,type,url`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) throw new Error(`Échec de récupération des posts X: ${res.status}`);
    const data = await res.json();

    const mediaByKey = new Map(
      (data.includes?.media ?? []).map((m: { media_key: string }) => [m.media_key, m])
    );

    return (data.data ?? [])
      .filter((t: { attachments?: { media_keys?: string[] } }) =>
        t.attachments?.media_keys?.some((k) => (mediaByKey.get(k) as { type?: string })?.type === "video")
      )
      .map((t: {
        id: string; text: string; created_at?: string;
        public_metrics?: { like_count?: number; reply_count?: number; retweet_count?: number };
      }) => ({
        externalId: t.id,
        title: t.text.slice(0, 100),
        thumbnailUrl: null,
        url: `https://x.com/i/status/${t.id}`,
        contentType: "POST" as const,
        publishedAt: t.created_at ? new Date(t.created_at) : null,
        views: 0, // nécessite le champ non-public organic_metrics (accès Pro/Enterprise)
        likes: t.public_metrics?.like_count ?? 0,
        comments: t.public_metrics?.reply_count ?? 0,
        shares: t.public_metrics?.retweet_count ?? null,
        avgViewDuration: null,
        retentionRate: null,
      }))
      .filter((v: NormalizedVideoStats) => !since || !v.publishedAt || v.publishedAt >= since);
  },

  async fetchRevenue() {
    // Le programme de monétisation X (Creator Revenue Sharing) ne fournit
    // aucune donnée de revenus via l'API publique → non disponible.
    return null;
  },
};
