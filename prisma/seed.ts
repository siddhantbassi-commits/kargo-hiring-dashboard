import { PrismaClient, type RoleSlug } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseRubricSource, assertWeightsSumTo100 } from "../src/lib/rubric/parse";
import { DEFAULT_SETTINGS } from "../src/lib/settings/defaults";

const prisma = new PrismaClient();

const ROLE_NAMES: Record<RoleSlug, string> = {
  PM: "Product Manager",
  SPM: "Senior Product Manager",
};

async function main() {
  const sourcePath = join(__dirname, "source", "rubric.txt");
  const sourceText = readFileSync(sourcePath, "utf-8");
  const parsedRubrics = parseRubricSource(sourceText);

  for (const rubric of parsedRubrics) {
    assertWeightsSumTo100(rubric);
  }

  const roleRecords = new Map<string, { id: string }>();
  for (const slug of Object.keys(ROLE_NAMES) as Array<keyof typeof ROLE_NAMES>) {
    const role = await prisma.role.upsert({
      where: { slug },
      update: { name: ROLE_NAMES[slug] },
      create: { slug, name: ROLE_NAMES[slug] },
    });
    roleRecords.set(slug, role);
  }

  const latestVersion = await prisma.rubricVersion.findFirst({
    orderBy: { version: "desc" },
  });

  // Re-seeding with an unchanged rubric.txt is a no-op: don't mint a new version
  // every deploy, only when the parsed criteria actually differ from the active one.
  if (latestVersion) {
    const existingCriteria = await prisma.rubricCriterion.findMany({
      where: { rubricVersionId: latestVersion.id },
    });
    const existingSignature = JSON.stringify(
      existingCriteria
        .map((c) => ({ role: c.roleId, key: c.key, weight: c.weight, description: c.description }))
        .sort((a, b) => (a.key + a.role).localeCompare(b.key + b.role))
    );
    const incomingSignature = JSON.stringify(
      parsedRubrics
        .flatMap((r) =>
          r.criteria.map((c) => ({
            role: roleRecords.get(r.roleSlug)!.id,
            key: c.key,
            weight: c.weight,
            description: c.description,
          }))
        )
        .sort((a, b) => (a.key + a.role).localeCompare(b.key + b.role))
    );
    if (existingSignature === incomingSignature) {
      console.log(`Rubric unchanged. Active version remains v${latestVersion.version}.`);
      await seedSettings();
      return;
    }
  }

  const nextVersionNumber = (latestVersion?.version ?? 0) + 1;
  await prisma.rubricVersion.updateMany({ data: { isActive: false } });
  const rubricVersion = await prisma.rubricVersion.create({
    data: {
      version: nextVersionNumber,
      isActive: true,
      sourceNote: "Seeded from prisma/source/rubric.txt",
    },
  });

  for (const rubric of parsedRubrics) {
    const role = roleRecords.get(rubric.roleSlug)!;
    for (const criterion of rubric.criteria) {
      await prisma.rubricCriterion.create({
        data: {
          rubricVersionId: rubricVersion.id,
          roleId: role.id,
          key: criterion.key,
          name: criterion.name,
          description: criterion.description,
          weight: criterion.weight,
          displayOrder: criterion.displayOrder,
        },
      });
    }
  }

  console.log(`Seeded rubric v${rubricVersion.version} for roles: ${Object.keys(ROLE_NAMES).join(", ")}`);
  await seedSettings();
}

async function seedSettings() {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.appSetting.upsert({
      where: { key },
      update: {},
      create: { key, value: String(value) },
    });
  }
  console.log("Default app_settings ensured (existing values were left untouched).");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
