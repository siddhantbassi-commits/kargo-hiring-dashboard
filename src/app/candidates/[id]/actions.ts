"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { processCandidate } from "@/lib/pipeline/process-candidate";
import { sendCandidateEmail } from "@/lib/email/send-candidate-email";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");
}

export async function rescoreCandidateAction(candidateId: string, _formData: FormData): Promise<void> {
  await requireAuth();
  try {
    await processCandidate(candidateId);
  } catch {
    // processCandidate already recorded the error on the candidate row; surfaced via the detail page.
  }
  revalidatePath(`/candidates/${candidateId}`);
}

export interface SaveDraftState {
  error?: string;
  savedAt?: number;
}

export async function saveDraftAction(
  candidateId: string,
  _prevState: SaveDraftState | undefined,
  formData: FormData
): Promise<SaveDraftState> {
  await requireAuth();
  const draftId = formData.get("draftId");
  const subject = formData.get("subject");
  const body = formData.get("body");

  if (typeof draftId !== "string" || !draftId) {
    return { error: "Missing draft reference." };
  }
  if (typeof subject !== "string" || typeof body !== "string" || !subject.trim() || !body.trim()) {
    return { error: "Subject and body cannot be empty." };
  }

  await prisma.emailDraft.update({
    where: { id: draftId, candidateId },
    data: { editedSubject: subject, editedBody: body },
  });

  revalidatePath(`/candidates/${candidateId}`);
  return { savedAt: Date.now() };
}

export interface SendState {
  error?: string;
  success?: boolean;
}

export async function sendEmailAction(
  candidateId: string,
  _prevState: SendState | undefined,
  formData: FormData
): Promise<SendState> {
  await requireAuth();
  const draftId = formData.get("draftId");
  if (typeof draftId !== "string" || !draftId) {
    return { error: "Missing draft reference." };
  }
  const result = await sendCandidateEmail(candidateId, draftId);
  revalidatePath(`/candidates/${candidateId}`);
  if (!result.ok) return { error: result.error };
  return { success: true };
}

export interface DeleteState {
  error?: string;
}

/**
 * Permanently deletes a candidate and everything derived from them (private
 * details, scores, interview brief, email drafts/sends) — every related
 * table cascades from candidates in the schema, so this one call is a
 * complete erasure, not a partial one. This is the data-deletion path for a
 * candidate PII removal request; there is no candidate-facing self-service
 * version since candidates never have accounts in this app — the founder
 * acts on their behalf.
 */
export async function deleteCandidateAction(
  candidateId: string,
  _prevState: DeleteState | undefined,
  _formData: FormData
): Promise<DeleteState> {
  await requireAuth();
  try {
    await prisma.candidate.delete({ where: { id: candidateId } });
  } catch {
    return { error: "Could not delete this candidate. Refresh and try again." };
  }
  revalidatePath("/");
  redirect("/");
}
