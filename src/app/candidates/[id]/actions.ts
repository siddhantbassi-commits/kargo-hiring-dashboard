"use server";

import { revalidatePath } from "next/cache";
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
