# Architecture

## Pipeline

```
CV Upload
  → Text Extraction            (lib/extraction — pdf-parse / mammoth / plain text)
  → PII Separation             (lib/pii/redact.ts — deterministic regex/heuristics, no LLM)
  → Sanitized CV persisted      (candidates.sanitizedCvText; PII goes only to candidate_private_details)
  → PM Scoring   ┐
  → SPM Scoring  ┘  (in parallel, lib/ai/score-candidate.ts — one Gemini call per rubric)
  → Weighted Scores             (lib/scoring/weighting.ts — computed in application code, not by the model)
  → Recommendation              (lib/scoring/recommendation.ts — driven by the APPLIED role's score only)
  → Interview Brief             (lib/ai/interview-brief.ts — only for top-N, above-threshold candidates)
  → Email Draft                 (lib/ai/email-draft.ts — uses {{candidate_name}} placeholder)
  → Founder Review              (dashboard + candidate detail page)
  → Resend                      (lib/email/send-candidate-email.ts — only on explicit founder click)
```

All of this is orchestrated by `lib/pipeline/ingest-candidate.ts` (extraction → redaction → persistence)
and `lib/pipeline/process-candidate.ts` (scoring → brief → email draft).

## Privacy architecture (critical path)

PII must never reach the AI layer. The boundary is enforced structurally, not just by convention:

- `lib/pii/redact.ts` is the **only** place that reads a candidate's name, email, or phone number out of
  raw CV text. It returns `{ pii, sanitizedText }` — everything downstream only ever sees `sanitizedText`.
- `candidates.sanitizedCvText` is the column every AI call reads from (`lib/ai/score-candidate.ts`,
  `lib/ai/interview-brief.ts`, `lib/ai/email-draft.ts` all take a `sanitizedCvText` string parameter and
  nothing else CV-shaped).
- `candidate_private_details` is a separate table holding `fullName` / `firstName` / `email` / `phone`.
  Nothing in `lib/ai/*` imports or queries this table.
- Emails are drafted with a literal `{{candidate_name}}` placeholder (see
  `lib/ai/prompts/email-draft.ts`). The real name is substituted **only** at
  `lib/email/personalize.ts`, called right before display/send — Gemini never receives it.
- The original uploaded file is not retained (see "Known limitations" in the README if you want to change
  this) — only extracted, redacted text is stored.

## Why two Gemini calls, not one

Section 34 of the brief allows either "one call scoring both rubrics" or "two parallel calls." We chose
**two parallel calls** (`Promise.all` in `processCandidate`) because:

- Each rubric has different weights and a slightly different framing (PM vs. SPM emphasize different
  things at the same criterion name), so a single call has to hold two rubrics in context and reliably
  attribute 10 criterion scores to the right rubric — an unnecessary reliability risk.
- Two independent structured-output calls are trivially schema-validated in isolation and retried
  independently on failure, rather than needing to retry a bigger, harder-to-validate combined response.
- The parallelism means there's no latency cost versus a single call.

Interview brief and email draft generation are each a single additional call, and are skipped/gated to
control cost (see below).

## Cost controls

- Interview briefs are generated only when a candidate both (a) scores at or above `SHORTLIST_THRESHOLD`
  for their applied role, and (b) currently ranks within the top `TOP_CANDIDATES_FOR_BRIEF` scorers for
  that role among already-`ready` candidates. Both are `app_settings`, editable from `/settings`.
- Downstream calls (brief, email) are given the scoring result rather than re-deriving it — see
  `processCandidate` passing `criterionResults` into `generateInterviewBrief`.

## Rubric versioning

`rubric_versions` holds a monotonically increasing `version` plus `isActive`. `prisma/seed.ts` parses
`prisma/source/rubric.txt` (via `lib/rubric/parse.ts`) and only mints a new version if the parsed criteria
actually differ from the currently active version — so redeploying with an unchanged rubric.txt is a
no-op, not version churn. Every `candidate_scores` row records which `rubric_version_id` produced it, so
historical scores remain explainable even after the rubric changes.

Rubric weights are asserted to sum to exactly 100 in two places: once at seed time
(`assertWeightsSumTo100`), and again defensively every time a rubric is loaded for scoring
(`lib/rubric/repository.ts` → `assertWeightsSum100`), so a bad manual edit to the database fails loudly
before it can silently under/over-weight a candidate.

## Prompt-injection defense

CV text is candidate-controlled and untrusted. Every prompt that includes CV text:

- Wraps it with explicit `--- BEGIN ... (untrusted candidate-provided data) ---` / `--- END ... ---`
  markers (`lib/ai/prompts/shared.ts` → `wrapUntrustedCandidateText`).
- Is prefixed with `PROMPT_INJECTION_DEFENSE`, which explicitly tells the model to treat any
  instruction-like text inside the CV as ordinary data, never reveal the system prompt or rubric
  internals, and never let CV content change the rubric or scoring.

## Idempotency and re-scoring

- `candidate_scores` is unique on `(candidateId, roleId, rubricVersionId)`; `processCandidate` upserts
  into that key, so re-running scoring for the same rubric version replaces the existing result rather
  than duplicating rows. A rubric version bump naturally produces a new, additional historical row.
- Email sending uses an atomic claim: `email_drafts.status` flips `draft → sending` via a conditional
  `updateMany` (only succeeds if it was still `draft`), so two concurrent Send clicks can't both dispatch
  Resend. See `lib/email/send-candidate-email.ts`.

## Auth

Single-founder credentials auth via Auth.js (NextAuth v5), backed entirely by two env vars
(`FOUNDER_EMAIL`, `FOUNDER_PASSWORD_HASH`) — no user table. `src/proxy.ts` (Next.js 16 renamed
`middleware.ts` → `proxy.ts`) protects every route except `/login` and the NextAuth API routes.
