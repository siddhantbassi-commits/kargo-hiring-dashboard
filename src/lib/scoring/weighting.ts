export interface WeightedCriterionInput {
  rawScore: number;
  weight: number;
}

/**
 * The ONLY place the final weighted role score is computed. Gemini is never
 * asked to do this arithmetic — see lib/ai/schema.ts, which deliberately has
 * no "totalScore" field for the model to fill in.
 */
export function computeWeightedTotal(inputs: WeightedCriterionInput[]): number {
  const total = inputs.reduce((sum, c) => sum + (c.rawScore * c.weight) / 100, 0);
  return Math.round(total * 100) / 100;
}

export function assertWeightsSum100(weights: number[], roleLabel: string): void {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum !== 100) {
    throw new Error(
      `Rubric configuration error for ${roleLabel}: criterion weights sum to ${sum}%, not 100%. Refusing to score.`
    );
  }
}
