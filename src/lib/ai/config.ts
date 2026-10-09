/**
 * Single place that names the Gemini model. Nothing else in the codebase
 * should reference a model string directly — change GEMINI_MODEL in env
 * (or the fallback below) to roll to a new model everywhere at once.
 */
export const AI_CONFIG = {
  // "-latest" alias rather than a dated snapshot: dated Gemini model names get
  // sunset (we hit this — "gemini-2.5-flash" 404'd with "no longer available
  // to new users"), and the alias is the SDK's own recommended default.
  model: process.env.GEMINI_MODEL || "gemini-flash-latest",
  scoringTemperature: 0.2,
  briefTemperature: 0.4,
  emailTemperature: 0.5,
  // Generous headroom: current Gemini models spend part of maxOutputTokens
  // on internal "thinking" tokens before the visible response, on top of
  // thinkingBudget below.
  maxOutputTokens: 8192,
  // Bounded rather than -1 (automatic) or 0 (disabled): a little reasoning
  // measurably helps multi-criterion rubric scoring, but an unbounded budget
  // is an open-ended cost/latency risk for a task this scoped.
  thinkingBudget: 1024,
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

/**
 * Constructor options for `new GoogleGenAI(...)`. GEMINI_BASE_URL is unset
 * everywhere except the E2E test run (see e2e/fixtures/gemini-server.ts and
 * playwright.config.ts), where it points the real SDK at a local fixture
 * server instead of the real Gemini API.
 */
export function geminiClientOptions() {
  const baseUrl = process.env.GEMINI_BASE_URL;
  return {
    apiKey: requireGeminiApiKey(),
    ...(baseUrl ? { httpOptions: { baseUrl } } : {}),
  };
}
