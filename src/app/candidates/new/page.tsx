import { UploadForm } from "./upload-form";

// Applies to the Server Action this page invokes (extraction + two Gemini
// scoring calls + brief + email draft can comfortably exceed the default).
export const maxDuration = 120;

export default function NewCandidatePage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Add Candidate</h1>
      <p className="mt-1 text-sm text-muted">
        Upload a CV. It will be scored against both the PM and SPM rubrics automatically.
      </p>
      <div className="mt-6 rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
        <UploadForm />
      </div>
    </div>
  );
}
