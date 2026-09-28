/**
 * Single place that names the Gemini model. Nothing else in the codebase
 * should reference a model string directly — change GEMINI_MODEL in env
 * (or the fallback below) to roll to a new model everywhere at once.
 */
export const AI_CONFIG = {
  model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  scoringTemperature: 0.2,
  briefTemperature: 0.4,
  emailTemperature: 0.5,
  maxOutputTokens: 4096,
  maxRetries: 1,
} as const;

export function requireGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Set it in your environment to enable AI scoring, interview briefs, and email drafting."
    );
  }
  return key;
}
