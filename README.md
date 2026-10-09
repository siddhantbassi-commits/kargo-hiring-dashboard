# Kargo Hiring Dashboard

An internal hiring dashboard for Kargo (fictional Series A logistics SaaS). Upload a candidate CV, and
the system extracts text, strips PII before any AI call, scores the candidate against **both** the
Product Manager and Senior Product Manager rubrics, ranks candidates, and drafts an interview brief and
an editable email — but never sends anything and never makes the hiring decision. The founder reviews
everything and clicks Send.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the pipeline, privacy design, and key implementation
decisions, and [PRIVACY.md](./PRIVACY.md) for the plain-language notice shown to candidates about how
their data is handled.

## What it does

1. Founder uploads a CV (PDF/DOCX/TXT) and picks the role the candidate applied for.
2. Server-side text extraction, then deterministic PII redaction (name/email/phone) — **before** any
   call to Gemini.
3. The sanitized (PII-free) CV is scored against both the PM and SPM rubrics in parallel.
4. Scores are combined into a weighted total in application code (never trusted from the model).
5. Candidates above the shortlist threshold and within the top-N for their role get a 3-sentence
   interview brief.
6. Every candidate gets an editable draft email (interview invite or rejection).
7. The founder reviews scores, evidence, and the draft on the candidate page, edits if needed, and
   explicitly clicks Send — which calls Resend server-side.

## Stack

Next.js 16 (App Router, TypeScript) · Tailwind CSS v4 · Prisma + Postgres · Zod · Gemini
(`@google/generative-ai`) · Resend · Auth.js (NextAuth v5, credentials) · Vitest

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run db:migrate           # creates tables and applies the schema
npm run db:seed              # seeds roles + rubric (from prisma/source/rubric.txt) + default settings
npm run dev
```

Visit `http://localhost:3000` and sign in with the founder credentials you configured (see below).

### Environment variables

| Variable | Required for | Notes |
| --- | --- | --- |
| `DATABASE_URL` | everything | Supabase pooled connection string (Settings → Database → Connection string → "Transaction" mode, port 6543, `?pgbouncer=true`) |
| `DIRECT_URL` | migrations | Supabase direct connection string ("Session" mode, port 5432) — only `prisma migrate` uses this |
| `FOUNDER_EMAIL` | login | The one allowed email address |
| `FOUNDER_PASSWORD_HASH` | login | Generate with `npm run hash-password -- "your-password"` |
| `AUTH_SECRET` | login | Session signing secret — generate with `npx auth secret` or `openssl rand -base64 32` |
| `GEMINI_API_KEY` | scoring/briefs/emails | From [Google AI Studio](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | optional | Defaults to `gemini-2.5-flash` |
| `RESEND_API_KEY` | sending email | From your Resend dashboard |
| `RESEND_FROM_EMAIL` | sending email | A verified sender address/domain in Resend |
| `NEXT_PUBLIC_APP_URL` | optional | Public URL of the deployed app |
| `CRON_SECRET` | `/api/health` cron | Generate with `openssl rand -hex 32` — only needed in Vercel's Production env, see below |

Everything up through scoring/briefs/drafts works without `RESEND_API_KEY`/`RESEND_FROM_EMAIL` — sending
is the only thing gated on those, and the UI reports a clear configuration error rather than faking a send.

### Database migrations

```bash
npm run db:migrate           # local dev — creates a migration and applies it
npm run db:migrate:deploy    # production — applies existing migrations, no prompts
```

### Rubric seeding

`prisma/source/rubric.txt` is the single source of truth for scoring criteria and weights — it's a copy
of the case's `rubric.txt`. `npm run db:seed` parses it (`src/lib/rubric/parse.ts`) and persists both the
PM and SPM rubrics as a versioned `rubric_versions` + `rubric_criteria` set. Re-seeding with an unchanged
file is a no-op; changing weights/descriptions in `rubric.txt` and re-seeding mints a new rubric version
without touching historical scores.

### Changing the shortlist threshold / top-N for briefs

Visit `/settings` in the app (founder-only), or update the `app_settings` table directly. Defaults are
`SHORTLIST_THRESHOLD=70` and `TOP_CANDIDATES_FOR_BRIEF=5`.

## Testing

```bash
npm run test
```

Covers: rubric weight validation, deterministic weighted scoring, PII redaction, Gemini response schema
validation, the full scoring pipeline (mocked AI layer) always scoring both PM and SPM and using the
applied role's score to drive the recommendation/email choice, name-substitution timing, prompt-injection
defense boilerplate, and duplicate-send prevention.

## Deployment (Vercel + GitHub)

1. Push this repo to GitHub.
2. Import it into Vercel.
3. Set all the environment variables above in the Vercel project settings (Production + Preview).
4. Run `npm run db:migrate:deploy` and `npm run db:seed` against the production database (locally with
   `DATABASE_URL` pointed at prod, or via a one-off Vercel deployment step).
5. Deploy.

Before deploying: `npm run lint`, `npx tsc --noEmit`, `npm run test`, `npm run build` should all pass.

## End-to-end tests

```bash
npm run e2e           # requires Chromium: npx playwright install chromium (once)
```

A focused Playwright suite covering the critical path only (not full UI coverage): login + the
unauthenticated redirect boundary, upload → score → review → delete a candidate, and the rubric
weight-change confirm gate. It runs the real app against a real (ephemeral) Postgres, but Gemini and
Resend are both faked — `GEMINI_BASE_URL`/`RESEND_BASE_URL` point the real SDKs at tiny local fixture
servers (`e2e/fixtures/*-server.ts`) instead of the real APIs, so the suite never costs real API usage
and never sends real email. The Gemini fixture reads the actual prompt text the app sends and returns a
response shaped to match whichever structured-output schema that prompt is for (see
`e2e/fixtures/gemini-server.ts`'s comment), rather than hardcoding per-test responses.

Runs in CI on every push/PR (`.github/workflows/e2e.yml`) against a disposable `postgres:16` service
container — migrated and seeded fresh each run, never touching the real Supabase database. To run it
locally, point `DATABASE_URL`/`DIRECT_URL` (env vars, not `.env.local` — see `playwright.config.ts`) at
your own disposable Postgres instance first.

## Monitoring

`vercel.json` configures a daily Vercel Cron Job (`0 3 * * *` UTC) that hits `/api/health`, which checks
Supabase (a trivial `SELECT 1`) and Gemini (`models.list`, a free/no-token-cost call) and, on failure,
emails the founder via Resend with what broke. The route authenticates the cron request itself via the
`CRON_SECRET` Bearer-token pattern Vercel documents, rather than a session cookie — it isn't behind the
app's own login. On Vercel's Hobby plan, cron jobs run at most once a day; a daily check is a floor, not
a replacement for a real uptime monitor, but it closes the gap where both real outages this engagement
hit were only found by someone manually clicking around.

## Privacy architecture (summary)

PII (name/email/phone) is extracted deterministically with regex/heuristics — never with an LLM — and
stored only in `candidate_private_details`, a table nothing in the AI layer ever queries. The AI only
ever sees `sanitizedCvText`, which has every detected occurrence of the name/email/phone replaced with a
placeholder. Emails are drafted with a `{{candidate_name}}` placeholder and the real name is substituted
server-side after generation. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full pipeline diagram.

**Data deletion:** every candidate detail page has a "Delete candidate" control (founder-only, two-step
confirm) that permanently removes the candidate and everything derived from them — private details,
scores, interview brief, email drafts/history — in one cascading delete. There's no candidate-facing
self-service version since candidates never have accounts here; the founder actions a deletion request on
their behalf.

## Known limitations

- **PII redaction is heuristic, not perfect.** Name detection in particular relies on "name-shaped first
  line" / "Name:" label heuristics and can occasionally mis-detect (e.g. an all-caps CV header). The
  candidate detail page surfaces a warning when detection confidence was low — review it before sending.
- **Original CV files are not retained** — only extracted, redacted text is stored. This is a deliberate
  default to minimize what's stored (configurable in `lib/pipeline/ingest-candidate.ts` if you want to add
  private file storage later).
- **Processing runs synchronously within the upload request** (no background job queue). A slow Gemini
  response could approach the serverless function timeout on some hosting tiers; `maxDuration` is set to
  120s on the relevant pages, but very large CVs or degraded Gemini latency could still exceed a platform's
  hard cap. A retry / re-score action is available if a run fails partway.
- **No automated queue for concurrent uploads** — candidates are processed one at a time, in the request
  that uploaded them.
- **Single founder account only**, by design (see the spec's auth requirements) — there is no multi-user
  support, roles, or audit log beyond `created_at`/`updated_at` timestamps.
