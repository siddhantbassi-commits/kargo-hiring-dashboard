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
});
