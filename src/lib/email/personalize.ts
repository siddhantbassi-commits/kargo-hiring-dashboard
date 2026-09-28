const PLACEHOLDER = "{{candidate_name}}";

/**
 * Substitutes the real candidate name into an AI-drafted template. This is
 * the ONLY function allowed to combine an AI-generated draft with real PII —
 * call it as late as possible, right before display or send.
 */
export function personalizeTemplate(text: string, firstName: string): string {
  return text.split(PLACEHOLDER).join(firstName);
}
