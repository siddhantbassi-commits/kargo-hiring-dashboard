import { createServer } from "node:http";
import { GEMINI_FIXTURE_PORT } from "../ports";

/**
 * A fake Gemini REST endpoint for E2E tests — never calls the real Gemini
 * API. The real app is pointed at this via GEMINI_BASE_URL (see
 * src/lib/ai/config.ts's geminiClientOptions, the @google/genai SDK's
 * httpOptions.baseUrl). It doesn't try to be a faithful Gemini clone; it
 * only implements the two calls this app actually makes:
 *   - GET  .../models            (health check / connectivity probe)
 *   - POST .../{model}:generateContent
 *
 * For generateContent, instead of hardcoding per-feature responses, it reads
 * the real prompt text the app sent and returns a response shaped to match
 * whichever of the app's three structured-output schemas that prompt is for
 * (score-candidate / interview-brief / email-draft — see src/lib/ai/schema.ts
 * and src/lib/ai/prompts/*). This keeps the fixture honest: it exercises the
 * same prompt-building and response-parsing code the real integration does,
 * rather than special-casing "whichever candidate the test happens to use."
 *
 * Scoring responses deliberately score every rubric criterion identically
 * (70/100): since application code computes the weighted total as
 * sum(score_i * weight_i) / 100, a uniform score makes the weighted total
 * equal that same score regardless of the rubric's actual weight split —
 * letting tests assert an exact total without hardcoding rubric weights.
 */

const UNIFORM_CRITERION_SCORE = 70;

function extractCriteria(promptText: string): { id: string; name: string }[] {
  const criteria: { id: string; name: string }[] = [];
  const pattern = /- id="([^"]+)" name="([^"]+)" weight=\d+%/g;
  for (const match of promptText.matchAll(pattern)) {
    criteria.push({ id: match[1], name: match[2] });
  }
  return criteria;
}

function buildModelResponseJson(promptText: string): string {
  if (promptText.includes("RUBRIC CRITERIA (")) {
    const criteria = extractCriteria(promptText);
    return JSON.stringify({
      criteria: criteria.map((c) => ({
        criterionId: c.id,
        criterionName: c.name,
        score: UNIFORM_CRITERION_SCORE,
        reason: "Fixture-generated score for E2E testing.",
        evidence: ["Fixture evidence quote."],
        evidenceStrength: "some",
      })),
      overallSummary: "Fixture-generated overall summary for E2E testing.",
      uncertainties: [],
    });
  }

  if (promptText.includes("Write EXACTLY three sentences")) {
    return JSON.stringify({
      sentences: [
        "Fixture sentence one about rubric fit.",
        "Fixture sentence two about supporting evidence.",
        "Fixture sentence three about what to probe in the interview.",
      ],
    });
  }

  // Otherwise: an email draft request (interview invite or rejection).
  return JSON.stringify({
    subject: "Following up on your application",
    body: "Hi {{candidate_name}},\n\nFixture-generated email body for E2E testing.\n\n— The Kargo Team",
  });
}

function geminiResponseEnvelope(modelResponseJson: string) {
  return {
    candidates: [
      {
        content: { role: "model", parts: [{ text: modelResponseJson }] },
        finishReason: "STOP",
      },
    ],
  };
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (req.method === "GET") {
    // ai.models.list() — the health-check route's connectivity probe. Any
    // 200 JSON body is sufficient; nothing reads its contents.
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ models: [] }));
    return;
  }

  if (req.method === "POST" && url.pathname.includes(":generateContent")) {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body || "{}");
        const promptText: string = parsed?.contents?.[0]?.parts?.[0]?.text ?? "";
        const modelResponseJson = buildModelResponseJson(promptText);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(geminiResponseEnvelope(modelResponseJson)));
      } catch (error) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: String(error) }));
      }
    });
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "Not found in Gemini fixture server." }));
});

server.listen(GEMINI_FIXTURE_PORT, () => {
  console.log(`[gemini-fixture] listening on http://127.0.0.1:${GEMINI_FIXTURE_PORT}`);
});
