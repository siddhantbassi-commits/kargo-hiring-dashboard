import { prisma } from "@/lib/db";
import type { RoleSlug } from "@prisma/client";
import { assertWeightsSum100 } from "@/lib/scoring/weighting";

export interface RubricCriterionView {
  id: string;
  key: string;
  name: string;
  description: string;
  weight: number;
  displayOrder: number;
}

export async function getActiveRubricVersion() {
  const version = await prisma.rubricVersion.findFirst({
    where: { isActive: true },
    orderBy: { version: "desc" },
  });
  if (!version) {
    throw new Error(
      "No active rubric version found. Run `npm run db:seed` to seed the rubric from prisma/source/rubric.txt."
    );
  }
  return version;
}

export async function getRoleBySlug(roleSlug: RoleSlug) {
  const role = await prisma.role.findUnique({ where: { slug: roleSlug } });
  if (!role) {
    throw new Error(`Role ${roleSlug} not found. Run \`npm run db:seed\` first.`);
  }
  return role;
}

export async function getActiveRubricCriteria(roleSlug: RoleSlug) {
  const version = await getActiveRubricVersion();
  const role = await getRoleBySlug(roleSlug);

  const criteria = await prisma.rubricCriterion.findMany({
    where: { rubricVersionId: version.id, roleId: role.id },
    orderBy: { displayOrder: "asc" },
  });

  assertWeightsSum100(
    criteria.map((c) => c.weight),
    roleSlug
  );

  return { role, rubricVersion: version, criteria };
}

/**
 * Edits rubric weights by minting a new RubricVersion with the same criteria
 * (name/description/key unchanged) but new weights — never mutating the
 * active version in place, so every historical candidate score stays
 * explainable against the rubric that actually produced it. Only ever
 * called from the founder-facing Rubric settings page.
 */
export async function updateRubricWeights(input: {
  PM: Record<string, number>;
  SPM: Record<string, number>;
}): Promise<{ version: number }> {
  const pmData = await getActiveRubricCriteria("PM");
  const spmData = await getActiveRubricCriteria("SPM");

  if (pmData.rubricVersion.id !== spmData.rubricVersion.id) {
    throw new Error("PM and SPM rubric criteria are not on the same active version — refusing to edit.");
  }

  const roleBatches: Array<{ roleSlug: RoleSlug; criteria: typeof pmData.criteria }> = [
    { roleSlug: "PM", criteria: pmData.criteria },
    { roleSlug: "SPM", criteria: spmData.criteria },
  ];

  const resolvedWeights = new Map<string, number>();

  for (const { roleSlug, criteria } of roleBatches) {
    const incoming = input[roleSlug];
    const weights = criteria.map((c) => {
      const w = incoming[c.key];
      if (typeof w !== "number" || !Number.isInteger(w) || w < 0 || w > 100) {
        throw new Error(`Invalid weight for ${roleSlug} criterion "${c.name}".`);
      }
      return w;
    });
    assertWeightsSum100(weights, roleSlug);
    criteria.forEach((c, i) => resolvedWeights.set(c.id, weights[i]));
  }

  const nextVersionNumber = pmData.rubricVersion.version + 1;
  const allOldCriteria = [...pmData.criteria, ...spmData.criteria];

  await prisma.$transaction(async (tx) => {
    await tx.rubricVersion.updateMany({ data: { isActive: false } });
    const newVersion = await tx.rubricVersion.create({
      data: {
        version: nextVersionNumber,
        isActive: true,
        sourceNote: "Weights edited by the founder via the Rubric page.",
      },
    });
    await tx.rubricCriterion.createMany({
      data: allOldCriteria.map((c) => ({
        rubricVersionId: newVersion.id,
        roleId: c.roleId,
        key: c.key,
        name: c.name,
        description: c.description,
        weight: resolvedWeights.get(c.id)!,
        displayOrder: c.displayOrder,
      })),
    });
  });

  return { version: nextVersionNumber };
}
