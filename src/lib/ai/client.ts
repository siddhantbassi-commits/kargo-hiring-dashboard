import { GoogleGenAI } from "@google/genai";
import type { ZodType } from "zod";
import { AI_CONFIG, geminiClientOptions } from "./config";

export class AIError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "AIError";
  }
}

interface GenerateStructuredOptions<T> {
  prompt: string;
  responseSchema: object;
  validator: ZodType<T>;
  temperature: number;
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

/**
 * Calls Gemini with a JSON-schema-constrained response, validates the result
 * with the given Zod validator, and retries once with an explicit repair
 * instruction if the model returns invalid JSON or a shape mismatch.
 * Never returns unvalidated data — callers can trust the return type.
 */
export async function generateStructuredJSON<T>({
  prompt,
  responseSchema,
  validator,
  temperature,
}: GenerateStructuredOptions<T>): Promise<T> {
  const ai = new GoogleGenAI(geminiClientOptions());

  let lastError: string | null = null;

  for (let attempt = 0; attempt <= AI_CONFIG.maxRetries; attempt++) {
    const attemptPrompt =
      attempt === 0
        ? prompt
        : `${prompt}\n\nYour previous response was invalid: ${lastError}\nReturn ONLY valid JSON matching the required schema. Do not include any other text.`;

    let rawText: string;
    try {
      const result = await ai.models.generateContent({
        model: AI_CONFIG.model,
        contents: [{ role: "user", parts: [{ text: attemptPrompt }] }],
        config: {
          temperature,
          maxOutputTokens: AI_CONFIG.maxOutputTokens,
          thinkingConfig: { thinkingBudget: AI_CONFIG.thinkingBudget },
          responseMimeType: "application/json",
          responseSchema: responseSchema as never,
        },
      });
      if (!result.text) {
        throw new Error(
          `Gemini returned no text (finishReason: ${result.candidates?.[0]?.finishReason ?? "unknown"})`
        );
      }
      rawText = result.text;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown Gemini API error";
      if (attempt === AI_CONFIG.maxRetries) {
        throw new AIError(`Gemini request failed after ${attempt + 1} attempt(s): ${lastError}`, error);
      }
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripCodeFence(rawText));
    } catch {
      lastError = "response was not valid JSON";
      if (attempt === AI_CONFIG.maxRetries) {
        throw new AIError(`Gemini returned malformed JSON after ${attempt + 1} attempt(s).`);
      }
      continue;
    }

    const validation = validator.safeParse(parsed);
    if (validation.success) {
      return validation.data;
    }

    lastError = validation.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    if (attempt === AI_CONFIG.maxRetries) {
      throw new AIError(`Gemini response failed schema validation: ${lastError}`);
    }
  }

  throw new AIError("Unreachable: exhausted retries without returning or throwing.");
}
