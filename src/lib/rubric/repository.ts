import { prisma } from "@/lib/db";
import type { RoleSlug } from "@prisma/client";
import { assertWeightsSum100 } from "@/lib/scoring/weighting";

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

export async function getActiveRubricCriteria(roleSlug: RoleSlug, rubricVersionId?: string) {
  const version = rubricVersionId
    ? { id: rubricVersionId }
    : await getActiveRubricVersion();
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
