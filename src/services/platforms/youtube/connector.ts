import type {
  PlatformConnector,
  NormalizedAccountStats,
  NormalizedVideoStats,
  OAuthTokenSet,
} from "@/types/platform";
import { PLATFORM_META } from "@/types/platform";

// ============================================================================
// Connecteur YouTube — utilise exclusivement les API officielles Google:
// - OAuth 2.0 (Google Identity Services)
// - YouTube Data API v3 (chaîne, vidéos, statistiques publiques)
// - YouTube Analytics API (rétention, durée de visionnage — nécessite le
//   scope yt-analytics.readonly)
//
// Ce fichier sert de référence d'implémentation pour les autres plateformes
// (services/platforms/tiktok, instagram, twitch, facebook, x), qui suivent
// exactement le même contrat PlatformConnector.
// ============================================================================

const GOOGLE_OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable d'environnement manquante: ${name}`);
  return value;
}

export const youtubeConnector: PlatformConnector = {
  key: "YOUTUBE",

  getAuthorizeUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: getEnv("YOUTUBE_CLIENT_ID"),
      redirect_uri: getEnv("YOUTUBE_REDIRECT_URI"),
      response_type: "code",
      access_type: "offline", // requis pour obtenir un refresh_token
      prompt: "consent",
      scope: PLATFORM_META.YOUTUBE.scopes.join(" "),
      state,
    });
    return `${GOOGLE_OAUTH_URL}?${params.toString()}`;
  },

  async exchangeCodeForToken(code: string): Promise<OAuthTokenSet> {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: getEnv("YOUTUBE_CLIENT_ID"),
        client_secret: getEnv("YOUTUBE_CLIENT_SECRET"),
        redirect_uri: getEnv("YOUTUBE_REDIRECT_URI"),
        grant_type: "authorization_code",
      }),
    });

    if (!res.ok) throw new Error(`Échec de l'échange du code YouTube: ${res.status}`);
    const data = await res.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope ?? null,
    };
  },

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenSet> {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: getEnv("YOUTUBE_CLIENT_ID"),
        client_secret: getEnv("YOUTUBE_CLIENT_SECRET"),
        grant_type: "refresh_token",
      }),
    });

    if (!res.ok) throw new Error(`Échec du renouvellement du token YouTube: ${res.status}`);
    const data = await res.json();

    return {
      accessToken: data.access_token,
      refreshToken, // Google ne renvoie pas toujours un nouveau refresh_token
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope ?? null,
    };
  },

  async fetchAccountStats(accessToken: string): Promise<NormalizedAccountStats> {
    const res = await fetch(
      `${YOUTUBE_API_BASE}/channels?part=snippet,statistics&mine=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) throw new Error(`Échec de récupération de la chaîne YouTube: ${res.status}`);
    const data = await res.json();
    const channel = data.items?.[0];

    if (!channel) throw new Error("Aucune chaîne YouTube associée à ce compte.");

    return {
      externalAccountId: channel.id,
      displayName: channel.snippet?.title ?? null,
      handle: channel.snippet?.customUrl ?? null,
      avatarUrl: channel.snippet?.thumbnails?.default?.url ?? null,
      followerCount: channel.statistics?.hiddenSubscriberCount
        ? 0
        : parseInt(channel.statistics?.subscriberCount ?? "0", 10),
      viewCount: channel.statistics?.viewCount ? parseInt(channel.statistics.viewCount, 10) : null,
    };
  },

  async fetchVideos(accessToken: string, since?: Date): Promise<NormalizedVideoStats[]> {
    // 1. Récupérer l'ID de la playlist "uploads" de la chaîne
    const channelRes = await fetch(
      `${YOUTUBE_API_BASE}/channels?part=contentDetails&mine=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!channelRes.ok) throw new Error("Échec de récupération de la chaîne YouTube.");
    const channelData = await channelRes.json();
    const uploadsPlaylistId =
      channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) return [];

    // 2. Lister les vidéos de la playlist uploads (paginé, jusqu'à 50 par page)
    const playlistRes = await fetch(
      `${YOUTUBE_API_BASE}/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!playlistRes.ok) throw new Error("Échec de récupération des vidéos YouTube.");
    const playlistData = await playlistRes.json();

    const videoIds: string[] = (playlistData.items ?? []).map(
      (item: { contentDetails: { videoId: string } }) => item.contentDetails.videoId
    );
    if (videoIds.length === 0) return [];

    // 3. Récupérer les statistiques détaillées pour chaque vidéo
    const statsRes = await fetch(
      `${YOUTUBE_API_BASE}/videos?part=snippet,statistics,contentDetails&id=${videoIds.join(",")}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!statsRes.ok) throw new Error("Échec de récupération des statistiques vidéo YouTube.");
    const statsData = await statsRes.json();

    return (statsData.items ?? [])
      .map((video: {
        id: string;
        snippet: { title: string; publishedAt: string; thumbnails?: { high?: { url: string } } };
        statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
        contentDetails: { duration: string };
      }) => {
        const publishedAt = new Date(video.snippet.publishedAt);
        const isShort = parseDurationSeconds(video.contentDetails.duration) <= 60;

        return {
          externalId: video.id,
          title: video.snippet.title,
          thumbnailUrl: video.snippet.thumbnails?.high?.url ?? null,
          url: `https://www.youtube.com/watch?v=${video.id}`,
          contentType: isShort ? "SHORT" : "VIDEO",
          publishedAt,
          views: parseInt(video.statistics.viewCount ?? "0", 10),
          likes: parseInt(video.statistics.likeCount ?? "0", 10),
          comments: parseInt(video.statistics.commentCount ?? "0", 10),
          // L'API Data v3 ne fournit pas le nombre de partages.
          shares: null,
          // Durée moyenne de visionnage et rétention nécessitent la YouTube
          // Analytics API (scope + reportType supplémentaires) — non appelée
          // ici pour rester dans un exemple raisonnablement concis, mais le
          // champ reste correctement à null plutôt que d'être inventé.
          avgViewDuration: null,
          retentionRate: null,
        } satisfies NormalizedVideoStats;
      })
      .filter((v: NormalizedVideoStats) => !since || !v.publishedAt || v.publishedAt >= since);
  },

  async fetchRevenue() {
    // La YouTube Analytics API expose les revenus estimés (estimatedRevenue)
    // uniquement pour les comptes YouTube Partner Program avec le scope
    // yt-analytics-monetary.readonly, soumis à une validation Google
    // supplémentaire. Tant que ce scope n'est pas approuvé pour l'app,
    // on renvoie explicitement "non disponible" plutôt que d'inventer un
    // chiffre.
    return null;
  },
};

/** Convertit une durée ISO 8601 (ex: "PT1M32S") en secondes. */
function parseDurationSeconds(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const [, h, m, s] = match;
  return (parseInt(h ?? "0") * 3600) + (parseInt(m ?? "0") * 60) + parseInt(s ?? "0");
}
