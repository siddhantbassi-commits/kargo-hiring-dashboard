import { getActiveRubricCriteria } from "@/lib/rubric/repository";
import { RubricForm } from "./rubric-form";

export const dynamic = "force-dynamic";

export default async function RubricPage() {
  const [pmData, spmData] = await Promise.all([
    getActiveRubricCriteria("PM"),
    getActiveRubricCriteria("SPM"),
  ]);

  const toInput = (criteria: typeof pmData.criteria) =>
    criteria.map((c) => ({ key: c.key, name: c.name, description: c.description, weight: c.weight }));

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Rubric</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Every candidate is scored against both rubrics below, regardless of the role they applied for.
        Weights decide how much each criterion contributes to the final score — adjust them here at any
        time. This is currently rubric{" "}
        <span className="font-medium text-foreground">v{pmData.rubricVersion.version}</span>. Editing
        weights creates a new version for future scoring; past candidates keep the rubric that actually
        scored them.
      </p>

      <div className="mt-6">
        <RubricForm pm={toInput(pmData.criteria)} spm={toInput(spmData.criteria)} version={pmData.rubricVersion.version} />
      </div>
    </div>
  );
}
