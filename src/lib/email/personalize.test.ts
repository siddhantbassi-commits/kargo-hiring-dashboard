import { describe, expect, it } from "vitest";
import { personalizeTemplate } from "./personalize";

describe("personalizeTemplate", () => {
  it("substitutes every occurrence of the placeholder with the real first name", () => {
    const template = "Hi {{candidate_name}}, thanks for applying. Best, {{candidate_name}} team.";
    expect(personalizeTemplate(template, "Priya")).toBe("Hi Priya, thanks for applying. Best, Priya team.");
  });

  it("is a no-op when the placeholder is absent", () => {
    expect(personalizeTemplate("Hello there", "Priya")).toBe("Hello there");
  });
});
