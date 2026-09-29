/**
 * Deterministic PII extraction/redaction. No LLM involvement whatsoever —
 * this module runs BEFORE any text is allowed anywhere near the Gemini layer.
 * See lib/ai/* for the boundary: those modules only ever receive the
 * `sanitizedText` this module produces, never the raw CV.
 */

export interface ExtractedPII {
  fullName: string;
  firstName: string;
  email: string | null;
  phone: string | null;
}

export interface RedactionResult {
  pii: ExtractedPII;
  sanitizedText: string;
  warnings: string[];
}

const EMAIL_REGEX = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

// Note: the captured number uses literal spaces (not \s) so it never crosses a
// newline — a match that spanned lines would get whitespace-collapsed by
// normalizePhone before being redacted, and would then no longer exactly
// match the (un-collapsed) substring in the original text.
const LABELED_PHONE_REGEX =
  /(?:phone|mobile|cell|tel(?:ephone)?|contact(?: no\.?| number)?)[ \t]*[:\-]?[ \t]*([+()\d][\d ().-]{5,20}\d)/gi;

const GENERIC_PHONE_REGEX = /(?<![\w@.])(\+?\d[\d ().-]{6,20}\d)(?![\w@.])/g;

const LABELED_NAME_REGEX = /(?:^|\n)\s*(?:full\s*name|candidate\s*name|name)\s*[:\-]\s*([^\n]{2,60})/i;

function countDigits(value: string): number {
  return (value.match(/\d/g) ?? []).length;
}

function normalizePhone(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function extractEmail(text: string): string | null {
  const match = text.match(EMAIL_REGEX);
  return match ? match[0] : null;
}

function extractPhone(text: string): string | null {
  LABELED_PHONE_REGEX.lastIndex = 0;
  const labeled = LABELED_PHONE_REGEX.exec(text);
  if (labeled && countDigits(labeled[1]) >= 7) {
    return normalizePhone(labeled[1]);
  }

  GENERIC_PHONE_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = GENERIC_PHONE_REGEX.exec(text)) !== null) {
    const candidate = match[1];
    const digits = countDigits(candidate);
    if (digits >= 7 && digits <= 15) {
      return normalizePhone(candidate);
    }
  }
  return null;
}

// Common resume section headers are short, all-letter, 2-4 word lines —
// structurally indistinguishable from a real name unless explicitly excluded.
// Every one of these appearing in the first 8 lines was previously
// misdetected as the candidate's name.
const SECTION_HEADER_WORDS = new Set([
  "summary",
  "profile",
  "objective",
  "professional",
  "synopsis",
  "experience",
  "work",
  "employment",
  "education",
  "academic",
  "qualifications",
  "skills",
  "expertise",
  "competencies",
  "projects",
  "achievements",
  "certifications",
  "awards",
  "publications",
  "research",
  "scholastic",
  "interests",
  "languages",
  "references",
  "curriculum",
  "vitae",
  "resume",
  "contact",
  "personal",
  "details",
  "profile:",
]);

function looksLikeSectionHeader(words: string[]): boolean {
  return words.some((word) => SECTION_HEADER_WORDS.has(word.toLowerCase().replace(/[:.]$/, "")));
}

// Many resume templates run the candidate's name directly into their job
// title on the same visual line (e.g. "Rohan Mehta Strategy & Operations
// Leader"), which defeats a whole-line match. These are the title/role words
// most likely to immediately follow a name in that pattern — used to find
// where the name portion ends rather than matching against the whole line.
const TITLE_STOPWORDS = new Set([
  "product",
  "senior",
  "junior",
  "lead",
  "head",
  "chief",
  "manager",
  "management",
  "director",
  "officer",
  "founder",
  "president",
  "vice",
  "strategy",
  "strategic",
  "operations",
  "engineer",
  "engineering",
  "developer",
  "designer",
  "analyst",
  "analytics",
  "associate",
  "consultant",
  "specialist",
  "executive",
  "leader",
  "growth",
  "marketing",
  "sales",
  "business",
  "technical",
  "data",
  "software",
  "project",
  "program",
  "delivery",
  "partner",
  "coordinator",
  "intern",
  "graduate",
  "student",
  "freelance",
  "independent",
  "co-founder",
  "cofounder",
  "ai",
  "new",
  "delhi",
  "ncr",
  "mumbai",
  "bangalore",
  "bengaluru",
  "gurgaon",
  "gurugram",
  "noida",
  "pune",
  "chennai",
  "hyderabad",
  "kolkata",
  "ahmedabad",
]);

/**
 * Finds a leading run of 2-4 capitalized words at the very start of the text,
 * stopping at the first digit/@ (contact info) or recognizable job-title word.
 * Handles "Name Job Title ... phone email" laid out as a single run, which a
 * whole-line match (looksLikeNameLine) cannot.
 */
function extractLeadingNameWords(text: string): string | null {
  const words = text.trim().split(/\s+/).slice(0, 8);
  const nameWords: string[] = [];
  for (const word of words) {
    if (/[\d@]/.test(word)) break;
    if (!/^[A-Z][a-zA-Z'.-]*$/.test(word)) break;
    const normalized = word.toLowerCase().replace(/[:.]$/, "");
    if (TITLE_STOPWORDS.has(normalized) || SECTION_HEADER_WORDS.has(normalized)) break;
    if (nameWords.length >= 4) break;
    nameWords.push(word);
  }
  return nameWords.length >= 2 ? nameWords.join(" ") : null;
}

function looksLikeNameLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 3 || trimmed.length > 60) return false;
  if (/[@\d]/.test(trimmed)) return false;
  if (/https?:\/\//i.test(trimmed)) return false;
  const words = trimmed.split(/\s+/);
  if (words.length < 2 || words.length > 5) return false;
  if (!words.every((word) => /^[A-Za-z][A-Za-z'.-]*$/.test(word))) return false;
  if (looksLikeSectionHeader(words)) return false;
  return true;
}

function extractName(text: string): { fullName: string; confident: boolean } {
  const labeled = text.match(LABELED_NAME_REGEX);
  if (labeled) {
    return { fullName: labeled[1].trim(), confident: true };
  }

  const lines = text.split(/\r?\n/);
  for (const line of lines.slice(0, 8)) {
    if (looksLikeNameLine(line)) {
      return { fullName: line.trim(), confident: true };
    }
  }

  const leading = extractLeadingNameWords(text);
  if (leading) {
    return { fullName: leading, confident: true };
  }

  return { fullName: "Candidate", confident: false };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function redactAllOccurrences(text: string, value: string, replacement: string): string {
  if (!value) return text;
  const pattern = new RegExp(escapeRegExp(value), "gi");
  return text.replace(pattern, replacement);
}

/**
 * Extracts name/email/phone deterministically and returns CV text with every
 * occurrence of that contact information replaced by placeholders. The
 * caller is responsible for persisting `pii` only into candidate_private_details
 * and `sanitizedText` only into the AI-facing candidate record.
 */
export function redactCv(rawText: string): RedactionResult {
  const warnings: string[] = [];

  const email = extractEmail(rawText);
  if (!email) warnings.push("No email address could be detected in the CV.");

  const phone = extractPhone(rawText);
  if (!phone) warnings.push("No phone number could be detected in the CV.");

  const { fullName, confident } = extractName(rawText);
  if (!confident) {
    warnings.push(
      "Candidate name could not be confidently detected; using a generic placeholder. Review manually."
    );
  }

  let sanitizedText = rawText;
  sanitizedText = redactAllOccurrences(sanitizedText, email ?? "", "[REDACTED_EMAIL]");
  sanitizedText = redactAllOccurrences(sanitizedText, phone ?? "", "[REDACTED_PHONE]");
  sanitizedText = redactAllOccurrences(sanitizedText, fullName, "[REDACTED_NAME]");

  // Best-effort second pass: standalone occurrences of individual name tokens
  // elsewhere in the document (e.g. a header/footer repeating just the first name).
  const nameTokens = fullName.split(/\s+/).filter((token) => token.length >= 3);
  for (const token of nameTokens) {
    const pattern = new RegExp(`\\b${escapeRegExp(token)}\\b`, "gi");
    sanitizedText = sanitizedText.replace(pattern, "[REDACTED_NAME]");
  }

  const firstName = fullName.split(/\s+/)[0] || "Candidate";

  return {
    pii: { fullName, firstName, email, phone },
    sanitizedText,
    warnings,
  };
}
