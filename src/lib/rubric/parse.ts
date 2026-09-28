import type { RoleSlug } from "@prisma/client";

export interface ParsedCriterion {
  key: string;
  name: string;
  description: string;
  weight: number;
  displayOrder: number;
}

export interface ParsedRubric {
  roleSlug: RoleSlug;
  criteria: ParsedCriterion[];
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// No "s" (dotAll) flag needed: parseSection() collapses newlines to spaces
// in `normalized` before this ever runs, so "." already matches everything
// relevant on a single logical line.
const CRITERION_PATTERN =
  /([A-Za-z][A-Za-z &]*?):\s*What a strong candidate looks like:\s*(.*?)\s*Weight:\s*(\d+)%/g;

function extractSection(fullText: string, startHeader: string, endHeader: string | null): string {
  const startIndex = fullText.indexOf(startHeader);
  if (startIndex === -1) {
    throw new Error(`Rubric source is missing the "${startHeader}" section header.`);
  }
  const afterStart = startIndex + startHeader.length;
  const endIndex = endHeader ? fullText.indexOf(endHeader, afterStart) : fullText.length;
  if (endHeader && endIndex === -1) {
    throw new Error(`Rubric source is missing the "${endHeader}" section header.`);
  }
  return fullText.slice(afterStart, endIndex === -1 ? undefined : endIndex);
}

function parseSection(sectionText: string): ParsedCriterion[] {
  const normalized = sectionText.replace(/\r\n/g, "\n").replace(/\n+/g, " ");
  const criteria: ParsedCriterion[] = [];
  let match: RegExpExecArray | null;
  CRITERION_PATTERN.lastIndex = 0;
  let order = 0;
  while ((match = CRITERION_PATTERN.exec(normalized)) !== null) {
    const [, rawName, rawDescription, rawWeight] = match;
    const name = rawName.trim();
    criteria.push({
      key: slugify(name),
      name,
      description: rawDescription.trim().replace(/\s+/g, " "),
      weight: Number.parseInt(rawWeight, 10),
      displayOrder: order++,
    });
  }
  return criteria;
}

/**
 * Parses KARGO HIRING RUBRIC source text into structured PM/SPM criteria.
 * This is the only place rubric.txt's layout is understood — seeding and
 * tests both depend on this function so the persisted rubric can never
 * silently drift from the source-of-truth file.
 */
export function parseRubricSource(sourceText: string): ParsedRubric[] {
  const pmSection = extractSection(sourceText, "PRODUCT MANAGER", "SENIOR PRODUCT MANAGER");
  const spmSection = extractSection(sourceText, "SENIOR PRODUCT MANAGER", null);

  const pmCriteria = parseSection(pmSection);
  const spmCriteria = parseSection(spmSection);

  return [
    { roleSlug: "PM" as RoleSlug, criteria: pmCriteria },
    { roleSlug: "SPM" as RoleSlug, criteria: spmCriteria },
  ];
}

export function assertWeightsSumTo100(rubric: ParsedRubric): void {
  const total = rubric.criteria.reduce((sum, c) => sum + c.weight, 0);
  if (total !== 100) {
    throw new Error(
      `Rubric configuration error: ${rubric.roleSlug} criteria weights sum to ${total}%, not 100%.`
    );
  }
}
