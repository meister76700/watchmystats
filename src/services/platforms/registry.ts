import type { PlatformConnector, PlatformKey } from "@/types/platform";
import { youtubeConnector } from "./youtube/connector";
import { tiktokConnector } from "./tiktok/connector";
import { instagramConnector } from "./instagram/connector";
import { twitchConnector } from "./twitch/connector";
import { facebookConnector } from "./facebook/connector";
import { xConnector } from "./x/connector";

// ============================================================================
// Point d'entrée unique pour obtenir le connecteur d'une plateforme.
// Ajouter une nouvelle plateforme = créer services/platforms/<nom>/connector.ts
// implémentant PlatformConnector, puis l'enregistrer ici. Rien d'autre dans
// l'application n'a besoin d'être modifié.
// ============================================================================

export const platformRegistry: Record<PlatformKey, PlatformConnector> = {
  YOUTUBE: youtubeConnector,
  TIKTOK: tiktokConnector,
  INSTAGRAM: instagramConnector,
  TWITCH: twitchConnector,
  FACEBOOK: facebookConnector,
  X: xConnector,
};

export function getConnector(platform: PlatformKey): PlatformConnector {
  return platformRegistry[platform];
}
