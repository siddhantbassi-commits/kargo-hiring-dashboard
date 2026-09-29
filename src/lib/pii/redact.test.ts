import { describe, expect, it } from "vitest";
import { redactCv } from "./redact";

describe("redactCv", () => {
  const sampleCv = `Priya Sharma
priya.sharma@example.com
+91 98765 43210

Product Manager at Kargo Logistics.
Contact Priya directly for references.
`;

  it("extracts name, email, and phone as PII", () => {
    const result = redactCv(sampleCv);
    expect(result.pii.fullName).toBe("Priya Sharma");
    expect(result.pii.firstName).toBe("Priya");
    expect(result.pii.email).toBe("priya.sharma@example.com");
    expect(result.pii.phone).toContain("98765");
  });

  it("never leaves the email or phone number in the sanitized text", () => {
    const result = redactCv(sampleCv);
    expect(result.sanitizedText).not.toContain("priya.sharma@example.com");
    expect(result.sanitizedText).not.toContain("98765");
  });

  it("redacts repeated occurrences of the candidate's name throughout the document", () => {
    const result = redactCv(sampleCv);
    expect(result.sanitizedText).not.toMatch(/Priya/);
    expect(result.sanitizedText).toContain("[REDACTED_NAME]");
  });

  it("still redacts email/phone even when no confident name is found", () => {
    const noNameCv = `Email: someone@example.com
    Phone: 555-123-4567

    10 years of experience shipping products across three companies with measurable outcomes.`;
    const result = redactCv(noNameCv);
    expect(result.sanitizedText).not.toContain("someone@example.com");
    expect(result.sanitizedText).not.toContain("555-123-4567");
    expect(result.warnings.some((w) => w.includes("name"))).toBe(true);
  });

  it("warns but does not throw when no email is present", () => {
    const result = redactCv("Jordan Lee\n\nBuilt three products from zero to one.");
    expect(result.pii.email).toBeNull();
    expect(result.warnings.some((w) => w.includes("email"))).toBe(true);
  });

  it("does not mistake a resume section header for the candidate's name", () => {
    // Regression test: "PROFESSIONAL SUMMARY", "WORK EXPERIENCE", etc. are
    // short, all-letter, 2-word lines — structurally identical to a real name
    // unless explicitly excluded. This affected every resume in a real batch
    // import where the name line itself didn't cleanly stand alone — the name
    // was instead recovered via the leading-words fallback (below).
    const noCleanNameLine = `Rohan Mehta Strategy & Operations Leader | Corporate Strategy
+91 98202 98211345 squad_1@pg27.mesaschool.co

PROFESSIONAL SUMMARY
Strategic partner to executive leadership with 4 years of experience.

WORK EXPERIENCE
Associate - Strategic Solutions | AntWalk`;
    const result = redactCv(noCleanNameLine);
    expect(result.pii.fullName).not.toBe("PROFESSIONAL SUMMARY");
    expect(result.pii.fullName).not.toBe("WORK EXPERIENCE");
  });

  it("recovers a name run into its job title on the same line via leading-words fallback", () => {
    // Common resume template: "Name Job Title" with no line break between
    // them, and contact info immediately after. No line matches
    // looksLikeNameLine here — extractLeadingNameWords stops at the first
    // recognizable title word instead.
    const mergedNameAndTitle = `Rohan Mehta Strategy & Operations Leader | Corporate Strategy
+91 98202 98211345 squad_1@pg27.mesaschool.co`;
    const result = redactCv(mergedNameAndTitle);
    expect(result.pii.fullName).toBe("Rohan Mehta");
    expect(result.pii.firstName).toBe("Rohan");
  });

  it("falls back to a low-confidence placeholder when no name can be found at all", () => {
    const noNameAnywhere = `PROFESSIONAL SUMMARY
this candidate's cv has no name-shaped text anywhere near the top.

WORK EXPERIENCE
some role at some company for 3 years, shipped several things.`;
    const result = redactCv(noNameAnywhere);
    expect(result.pii.fullName).toBe("Candidate");
    expect(result.warnings.some((w) => w.includes("name"))).toBe(true);
  });

  it("still finds a real name that happens to precede a section header", () => {
    const cv = `Jane Doe

PROFESSIONAL SUMMARY
Built three products from zero to one.`;
    const result = redactCv(cv);
    expect(result.pii.fullName).toBe("Jane Doe");
  });
});
