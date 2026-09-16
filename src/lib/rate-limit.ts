// ============================================================================
// Rate limiting des routes sensibles (inscription, connexion, reset mot de
// passe). Utilise Upstash Redis si configuré (recommandé en production,
// fonctionne sur infra serverless), sinon retombe sur une limite en mémoire
// locale (suffisant en développement, mais non partagée entre instances).
// ============================================================================

type RateResult = { success: boolean; remaining: number };

const memoryStore = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 5;

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
}

async function memoryRateLimit(key: string): Promise<RateResult> {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { success: true, remaining: MAX_REQUESTS - 1 };
  }

  if (entry.count >= MAX_REQUESTS) {
    return { success: false, remaining: 0 };
  }

  entry.count += 1;
  return { success: true, remaining: MAX_REQUESTS - entry.count };
}

export async function checkRateLimit(req: Request, scope: string): Promise<RateResult> {
  const ip = getClientIp(req);
  const key = `ratelimit:${scope}:${ip}`;

  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const { Ratelimit } = await import("@upstash/ratelimit");
      const { Redis } = await import("@upstash/redis");
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      const ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(MAX_REQUESTS, "60 s"),
      });
      const result = await ratelimit.limit(key);
      return { success: result.success, remaining: result.remaining };
    } catch {
      // En cas d'échec de connexion à Redis, on retombe sur la mémoire locale
      // plutôt que de bloquer entièrement la route.
      return memoryRateLimit(key);
    }
  }

  return memoryRateLimit(key);
}
