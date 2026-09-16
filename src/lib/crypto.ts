import crypto from "crypto";

// ============================================================================
// Chiffrement des tokens OAuth (access_token / refresh_token) avant stockage
// en base de données. Algorithme: AES-256-GCM (authenticated encryption).
//
// La clé provient de TOKEN_ENCRYPTION_KEY (32 octets en hexadécimal, voir
// .env.example). Elle ne doit JAMAIS être committée ni exposée au frontend.
// ============================================================================

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY manquante ou invalide. Générez-en une avec: openssl rand -hex 32"
    );
  }
  return Buffer.from(key, "hex");
}

/**
 * Chiffre une chaîne (typiquement un token OAuth) et renvoie une chaîne
 * combinée "iv:authTag:ciphertext" encodée en base64, prête à être stockée
 * dans une colonne *Enc du schéma Prisma.
 */
export function encryptToken(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

/**
 * Déchiffre une valeur produite par encryptToken(). Ne doit être appelée
 * que côté serveur (services d'intégration plateforme, jobs de sync).
 */
export function decryptToken(payload: string): string {
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
