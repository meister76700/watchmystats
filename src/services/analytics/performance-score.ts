// ============================================================================
// Calcul du Performance Score (0 à 100) d'un contenu.
//
// MÉTHODE (documentée comme demandé dans le cahier des charges) :
//
// Le score combine 4 composantes, chacune normalisée entre 0 et 100 puis
// pondérée. Chaque composante est calculée RELATIVEMENT à la moyenne des
// autres contenus du même créateur sur la même plateforme (et non contre un
// barème arbitraire), afin que le score reste pertinent quelle que soit la
// taille de l'audience du créateur.
//
//   1. Vues relatives       (poids 35%) — views / moyenne des vues du créateur
//   2. Engagement           (poids 35%) — (likes + comments + shares) / views
//   3. Croissance récente   (poids 15%) — vitesse d'accumulation des vues
//                                          depuis la publication
//   4. Rétention            (poids 15%) — uniquement si fournie par la
//                                          plateforme ; sinon son poids est
//                                          redistribué sur les 3 autres
//                                          composantes pour ne jamais
//                                          pénaliser un contenu à cause d'une
//                                          donnée absente.
//
// Chaque composante brute est ensuite compressée avec une fonction
// logistique pour éviter qu'un contenu viral n'écrase l'échelle et que le
// score reste lisible entre 0 et 100.
//
// IMPORTANT: si le créateur a moins de 3 contenus publiés, il n'y a pas
// assez de données pour une comparaison relative fiable — la fonction
// renvoie alors `null` plutôt que d'inventer un score.
// ============================================================================

export interface VideoForScoring {
  views: number;
  likes: number;
  comments: number;
  shares: number | null;
  retentionRate: number | null; // 0-100, null si non disponible
  publishedAt: Date | null;
}

function logisticCompress(ratio: number): number {
  // Transforme un ratio (contenu / moyenne) centré sur 1 en score 0-100,
  // avec 50 comme "dans la moyenne du créateur".
  const k = 1.4; // pente de la courbe
  const score = 100 / (1 + Math.exp(-k * (ratio - 1)));
  return Math.max(0, Math.min(100, score));
}

export function calculatePerformanceScore(
  target: VideoForScoring,
  creatorContents: VideoForScoring[]
): number | null {
  if (creatorContents.length < 3) return null;

  const avgViews = average(creatorContents.map((c) => c.views)) || 1;
  const avgEngagementRate = average(creatorContents.map((c) => engagementRate(c))) || 0.0001;

  const viewsScore = logisticCompress(target.views / avgViews);
  const engagementScore = logisticCompress(engagementRate(target) / avgEngagementRate);

  const growthScore = computeGrowthScore(target, creatorContents);

  const hasRetention = target.retentionRate !== null;
  const retentionScore = hasRetention ? Math.max(0, Math.min(100, target.retentionRate!)) : null;

  // Pondération, avec redistribution si la rétention est absente.
  const weights = hasRetention
    ? { views: 0.35, engagement: 0.35, growth: 0.15, retention: 0.15 }
    : { views: 0.41, engagement: 0.41, growth: 0.18, retention: 0 };

  const total =
    viewsScore * weights.views +
    engagementScore * weights.engagement +
    growthScore * weights.growth +
    (retentionScore ?? 0) * weights.retention;

  return Math.round(total);
}

function engagementRate(v: VideoForScoring): number {
  if (v.views === 0) return 0;
  const interactions = v.likes + v.comments + (v.shares ?? 0);
  return interactions / v.views;
}

function computeGrowthScore(target: VideoForScoring, creatorContents: VideoForScoring[]): number {
  if (!target.publishedAt) return 50; // neutre si date inconnue

  const ageDays = Math.max(1, (Date.now() - target.publishedAt.getTime()) / 86_400_000);
  const viewsPerDay = target.views / ageDays;

  const avgViewsPerDay =
    average(
      creatorContents
        .filter((c) => c.publishedAt)
        .map((c) => c.views / Math.max(1, (Date.now() - c.publishedAt!.getTime()) / 86_400_000))
    ) || 1;

  return logisticCompress(viewsPerDay / avgViewsPerDay);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Compare un contenu à la moyenne du créateur et renvoie une phrase prête à
 * afficher, par exemple : "Cette vidéo est 43 % plus performante que ta
 * moyenne." Renvoie null si la comparaison n'est pas calculable.
 */
export function comparePerformanceToAverage(
  target: VideoForScoring,
  creatorContents: VideoForScoring[]
): string | null {
  const others = creatorContents.filter((c) => c !== target);
  if (others.length < 3) return null;

  const avgViews = average(others.map((c) => c.views)) || 1;
  const diffPercent = Math.round(((target.views - avgViews) / avgViews) * 100);

  if (diffPercent === 0) return "Cette vidéo est dans la moyenne de tes contenus.";
  if (diffPercent > 0) return `Cette vidéo est ${diffPercent} % plus performante que ta moyenne.`;
  return `Cette vidéo est ${Math.abs(diffPercent)} % moins performante que ta moyenne.`;
}
