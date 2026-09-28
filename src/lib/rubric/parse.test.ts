import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseRubricSource, assertWeightsSumTo100 } from "./parse";

describe("parseRubricSource", () => {
  const sourceText = readFileSync(join(__dirname, "../../../prisma/source/rubric.txt"), "utf-8");

  it("parses both PM and SPM sections with 5 criteria each", () => {
    const rubrics = parseRubricSource(sourceText);
    expect(rubrics).toHaveLength(2);

    const pm = rubrics.find((r) => r.roleSlug === "PM")!;
    const spm = rubrics.find((r) => r.roleSlug === "SPM")!;

    expect(pm.criteria).toHaveLength(5);
    expect(spm.criteria).toHaveLength(5);

    expect(pm.criteria.map((c) => c.name)).toContain("Independent Ownership");
    expect(pm.criteria.find((c) => c.name === "Independent Ownership")?.weight).toBe(25);
    expect(spm.criteria.find((c) => c.name === "Independent Ownership")?.weight).toBe(30);
  });

  it("every rubric's criterion weights sum to exactly 100", () => {
    const rubrics = parseRubricSource(sourceText);
    for (const rubric of rubrics) {
      expect(() => assertWeightsSumTo100(rubric)).not.toThrow();
    }
  });

  it("throws a clear error if weights do not sum to 100", () => {
    expect(() =>
      assertWeightsSumTo100({
        roleSlug: "PM",
        criteria: [
          { key: "a", name: "A", description: "d", weight: 60, displayOrder: 0 },
          { key: "b", name: "B", description: "d", weight: 30, displayOrder: 1 },
        ],
      })
    ).toThrow(/90%/);
  });
});
