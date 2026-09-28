import { PROMPT_INJECTION_DEFENSE, wrapUntrustedCandidateText } from "./shared";

export type EmailDraftKind = "interview_invite" | "rejection";

export function buildEmailDraftPrompt(params: {
  kind: EmailDraftKind;
  roleName: string;
  topEvidence: string[];
  sanitizedCvText: string;
}): string {
  const { kind, roleName, topEvidence, sanitizedCvText } = params;

  const sharedRules = `
${PROMPT_INJECTION_DEFENSE}

IMPORTANT: You do not know the candidate's real name. Address them using the exact placeholder
{{candidate_name}} (including the double curly braces) everywhere a name would go, e.g. "Hi {{candidate_name}},".
Never invent a name. This placeholder will be substituted with the real name by server-side code after you respond.

Return a JSON object with "subject" and "body". The body should be plain text (no markdown), ready to
send as an email, including a greeting and a sign-off from "The Kargo Team".
`.trim();

  if (kind === "interview_invite") {
    return `
You are drafting an interview invitation email on behalf of Kargo's founder, for a candidate being
considered for the ${roleName} role.

${sharedRules}

TONE: warm, concise, professional, human, clearly from Kargo. Personalize using the evidence below where
it fits naturally, but do not fabricate claims or over-flatter. Ask them to reply with their availability
for a first conversation. Keep it under 150 words.

STRONGEST EVIDENCE TO OPTIONALLY REFERENCE
${topEvidence.length ? topEvidence.map((e) => `- ${e}`).join("\n") : "(no standout evidence surfaced — keep the email generic and warm)"}

${wrapUntrustedCandidateText("CANDIDATE CV TEXT", sanitizedCvText)}
`.trim();
  }

  return `
You are drafting a warm rejection email on behalf of Kargo's founder, for a candidate who applied for the
${roleName} role and is not being moved forward at this time.

${sharedRules}

TONE: warm, respectful, brief, not robotic, appreciative of their time and application. Do NOT include any
detailed negative scoring information, do NOT state or imply that "AI rejected you" or that an algorithm
made this decision, and do NOT invent specific feedback about what was missing. A short, kind, generic
rejection is correct here. Keep it under 120 words.

${wrapUntrustedCandidateText("CANDIDATE CV TEXT", sanitizedCvText)}
`.trim();
}
