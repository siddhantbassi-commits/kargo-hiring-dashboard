"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { updateRubricWeights } from "@/lib/rubric/repository";

export interface RubricState {
  error?: string;
  success?: boolean;
  version?: number;
}

export async function updateRubricWeightsAction(
  _prevState: RubricState | undefined,
  formData: FormData
): Promise<RubricState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated." };

  const pmWeights: Record<string, number> = {};
  const spmWeights: Record<string, number> = {};

  for (const [name, value] of formData.entries()) {
    const match = /^weight__(PM|SPM)__(.+)$/.exec(name);
    if (!match) continue;
    const [, role, key] = match;
    const n = Number(value);
    if (!Number.isFinite(n)) {
      return { error: `"${value}" is not a valid weight.` };
    }
    (role === "PM" ? pmWeights : spmWeights)[key] = Math.round(n);
  }

  try {
    const result = await updateRubricWeights({ PM: pmWeights, SPM: spmWeights });
    revalidatePath("/rubric");
    return { success: true, version: result.version };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to update the rubric." };
  }
}
