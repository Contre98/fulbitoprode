export const SCORE_RULES = {
  exact: 3,
  outcome: 1,
  miss: 0
} as const;

export function calculatePredictionPoints(prediction: { home: number; away: number }, score: { home: number; away: number }) {
  if (prediction.home === score.home && prediction.away === score.away) {
    return SCORE_RULES.exact;
  }

  const predictionDiff = Math.sign(prediction.home - prediction.away);
  const scoreDiff = Math.sign(score.home - score.away);
  return predictionDiff === scoreDiff ? SCORE_RULES.outcome : SCORE_RULES.miss;
}
