"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { updateSetting } from "@/lib/settings";

export interface SettingsState {
  error?: string;
  success?: boolean;
}

export async function updateSettingsAction(
  _prevState: SettingsState | undefined,
  formData: FormData
): Promise<SettingsState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated." };

  const threshold = Number(formData.get("shortlistThreshold"));
  const topN = Number(formData.get("topCandidatesForBrief"));

  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
    return { error: "Shortlist threshold must be a number between 0 and 100." };
  }
  if (!Number.isInteger(topN) || topN < 1 || topN > 100) {
    return { error: "Top candidates for brief must be a whole number between 1 and 100." };
  }

  await updateSetting("SHORTLIST_THRESHOLD", threshold);
  await updateSetting("TOP_CANDIDATES_FOR_BRIEF", topN);

  revalidatePath("/settings");
  return { success: true };
}
