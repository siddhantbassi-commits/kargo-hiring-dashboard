import { getAllSettings } from "@/lib/settings";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getAllSettings();

  return (
    <div className="mx-auto max-w-xl px-6 py-8">
      <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted">
        These thresholds drive recommendations across the dashboard. Changes apply to future scoring and
        recommendation calculations immediately.
      </p>
      <div className="mt-6 rounded-lg border border-border bg-surface p-6">
        <SettingsForm
          shortlistThreshold={settings.SHORTLIST_THRESHOLD}
          topCandidatesForBrief={settings.TOP_CANDIDATES_FOR_BRIEF}
        />
      </div>
    </div>
  );
}
