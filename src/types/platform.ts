// ============================================================================
// Types partagés par tous les connecteurs de plateforme.
// Chaque service (src/services/platforms/<plateforme>) doit implémenter
// l'interface PlatformConnector pour rester interchangeable.
// ============================================================================

export type PlatformKey = "YOUTUBE" | "TIKTOK" | "INSTAGRAM" | "TWITCH" | "FACEBOOK" | "X";

export interface PlatformMeta {
  key: PlatformKey;
  label: string;
  color: string; // classe tailwind "platform-*" ou couleur hex
  authorizeUrl?: string; // construit dynamiquement par le connecteur
  scopes: string[];
  docsUrl: string;
}

export const PLATFORM_META: Record<PlatformKey, PlatformMeta> = {
  YOUTUBE: {
    key: "YOUTUBE",
    label: "YouTube",
    color: "#FF3B30",
    scopes: [
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/yt-analytics.readonly",
    ],
    docsUrl: "https://developers.google.com/youtube/v3",
  },
  TIKTOK: {
    key: "TIKTOK",
    label: "TikTok",
    color: "#25F4EE",
    scopes: ["user.info.basic", "video.list"],
    docsUrl: "https://developers.tiktok.com/doc/login-kit-web",
  },
  INSTAGRAM: {
    key: "INSTAGRAM",
    label: "Instagram",
    color: "#E1306C",
    scopes: ["instagram_basic", "instagram_manage_insights"],
    docsUrl: "https://developers.facebook.com/docs/instagram-api",
  },
  TWITCH: {
    key: "TWITCH",
    label: "Twitch",
    color: "#9146FF",
    scopes: ["channel:read:subscriptions", "analytics:read:games"],
    docsUrl: "https://dev.twitch.tv/docs/api",
  },
  FACEBOOK: {
    key: "FACEBOOK",
    label: "Facebook",
    color: "#1877F2",
    scopes: ["pages_read_engagement", "read_insights"],
    docsUrl: "https://developers.facebook.com/docs/graph-api",
  },
  X: {
    key: "X",
    label: "X",
    color: "#E7E9EA",
    scopes: ["tweet.read", "users.read", "offline.access"],
    docsUrl: "https://developer.x.com/en/docs/x-api",
  },
};

/** Statistiques normalisées d'une vidéo, telles que renvoyées par un connecteur. */
export interface NormalizedVideoStats {
  externalId: string;
  title: string;
  thumbnailUrl: string | null;
  url: string | null;
  contentType: "VIDEO" | "SHORT" | "REEL" | "LIVE" | "POST";
  publishedAt: Date | null;
  views: number;
  likes: number;
  comments: number;
  shares: number | null; // null si l'API ne fournit pas cette donnée
  avgViewDuration: number | null;
  retentionRate: number | null;
}

export interface NormalizedAccountStats {
  externalAccountId: string;
  displayName: string | null;
  handle: string | null;
  avatarUrl: string | null;
  followerCount: number;
  viewCount: number | null;
}

export interface OAuthTokenSet {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scope: string | null;
}

/**
 * Contrat que chaque intégration de plateforme doit respecter.
 * Permet d'ajouter une nouvelle plateforme sans toucher au reste du système
 * (dashboard, sync engine, performance score...).
 */
export interface PlatformConnector {
  key: PlatformKey;
  getAuthorizeUrl(state: string): string;
  exchangeCodeForToken(code: string): Promise<OAuthTokenSet>;
  refreshAccessToken(refreshToken: string): Promise<OAuthTokenSet>;
  fetchAccountStats(accessToken: string): Promise<NormalizedAccountStats>;
  fetchVideos(accessToken: string, since?: Date): Promise<NormalizedVideoStats[]>;
  /** Renvoie null si la plateforme ne donne pas accès aux revenus via son API publique. */
  fetchRevenue(accessToken: string): Promise<{ amountCents: number; currency: string } | null>;
}
