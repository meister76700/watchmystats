// ============================================================================
// WatchMyStats AI — génération d'insights.
//
// RÈGLE ABSOLUE : l'IA ne doit JAMAIS inventer de statistiques. Chaque
// insight produit ici est calculé directement à partir des données réelles
// de la base (via Prisma), jamais générées ou extrapolées par un LLM.
//
// Deux modes :
// 1. Mode "règles" (par défaut, actif dès maintenant) — des insights
//    déterministes calculés directement sur les données.
// 2. Mode "LLM" (préparé, inactif tant que AI_PROVIDER_API_KEY n'est pas
//    renseignée) — le LLM reçoit UNIQUEMENT les chiffres déjà calculés en
//    mode règles et reçoit l'instruction stricte de reformuler sans ajouter
//    de données. Voir generateNarrativeInsight() ci-dessous.
// ============================================================================

export interface InsightInput {
  totalViews: number;
  totalViewsPreviousPeriod: number;
  topPerformingContentTitle: string | null;
  topPerformingContentDiffPercent: number | null;
  bestEngagementContentTitle: string | null;
  followerGrowthPercent: number | null;
  contentCount: number;
}

export interface Insight {
  emoji: string;
  message: string;
}

export function generateRuleBasedInsights(data: InsightInput): Insight[] {
  const insights: Insight[] = [];

  // Pas assez de données -> le dire honnêtement plutôt que d'inventer.
  if (data.contentCount < 3) {
    insights.push({
      emoji: "📉",
      message:
        "Pas encore assez de contenus publiés pour générer des analyses fiables. Reviens quand tu auras au moins 3 contenus synchronisés.",
    });
    return insights;
  }

  if (data.totalViewsPreviousPeriod > 0) {
    const growth = Math.round(
      ((data.totalViews - data.totalViewsPreviousPeriod) / data.totalViewsPreviousPeriod) * 100
    );
    if (growth > 0) {
      insights.push({ emoji: "📈", message: `Ton audience a augmenté de ${growth} % cette période.` });
    } else if (growth < 0) {
      insights.push({
        emoji: "📉",
        message: `Tes vues ont baissé de ${Math.abs(growth)} % par rapport à la période précédente.`,
      });
    }
  }

  if (data.topPerformingContentTitle && data.topPerformingContentDiffPercent !== null) {
    insights.push({
      emoji: "🚀",
      message: `"${data.topPerformingContentTitle}" obtient ${data.topPerformingContentDiffPercent} % plus de vues que ta moyenne.`,
    });
  }

  if (data.bestEngagementContentTitle) {
    insights.push({
      emoji: "💡",
      message: `Ton contenu avec le meilleur engagement est "${data.bestEngagementContentTitle}".`,
    });
  }

  if (data.followerGrowthPercent !== null) {
    const sign = data.followerGrowthPercent >= 0 ? "augmenté" : "diminué";
    insights.push({
      emoji: "👥",
      message: `Tes abonnés ont ${sign} de ${Math.abs(data.followerGrowthPercent)} % sur la période.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      emoji: "ℹ️",
      message: "Aucune tendance significative détectée sur cette période avec les données disponibles.",
    });
  }

  return insights;
}

/**
 * Reformule les insights calculés en langage plus naturel via un LLM,
 * SANS jamais laisser le modèle introduire de nouveaux chiffres. Le modèle
 * ne reçoit que les insights déjà calculés et reçoit l'instruction explicite
 * de ne pas halluciner de données.
 *
 * Inactif tant que AI_PROVIDER_API_KEY n'est pas configurée : renvoie alors
 * simplement les insights bruts, ce qui garantit que l'absence de clé API
 * n'empêche jamais la fonctionnalité de base de fonctionner.
 */
export async function generateNarrativeInsight(insights: Insight[]): Promise<string> {
  const rawSummary = insights.map((i) => `${i.emoji} ${i.message}`).join("\n");

  if (!process.env.AI_PROVIDER_API_KEY) {
    return rawSummary;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.AI_PROVIDER_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system:
        "Tu reformules des statistiques déjà calculées en 2-3 phrases naturelles et encourageantes, en français. " +
        "RÈGLE STRICTE: n'invente, n'estime ni n'ajoute AUCUN chiffre qui n'est pas déjà présent dans le texte fourni. " +
        "Si une donnée manque, ne la mentionne simplement pas.",
      messages: [{ role: "user", content: rawSummary }],
    }),
  });

  if (!response.ok) return rawSummary;

  const data = await response.json();
  const text = data.content?.find((b: { type: string }) => b.type === "text")?.text;
  return text ?? rawSummary;
}
