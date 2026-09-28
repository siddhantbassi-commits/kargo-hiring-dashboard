"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ingestCandidate } from "@/lib/pipeline/ingest-candidate";
import { processCandidate } from "@/lib/pipeline/process-candidate";
import { ExtractionError } from "@/lib/extraction";

export interface UploadState {
  error?: string;
}

export async function uploadCandidateAction(
  _prevState: UploadState | undefined,
  formData: FormData
): Promise<UploadState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated." };

  const file = formData.get("file");
  const appliedRole = formData.get("appliedRole");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a CV file to upload." };
  }
  if (appliedRole !== "PM" && appliedRole !== "SPM") {
    return { error: "Select the role this candidate applied for." };
  }

  let candidateId: string;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await ingestCandidate({
      fileBuffer: buffer,
      mimeType: file.type,
      originalFilename: file.name,
      appliedRoleSlug: appliedRole,
    });
    candidateId = result.candidateId;
  } catch (error) {
    if (error instanceof ExtractionError) return { error: error.message };
    return {
      error: `Unexpected error while processing the file: ${error instanceof Error ? error.message : "unknown error"}`,
    };
  }

  try {
    await processCandidate(candidateId);
  } catch {
    // processCandidate already persisted processingStatus="error" with a message.
    // We still route the founder to the detail page, which surfaces that error and a retry option.
  }

  redirect(`/candidates/${candidateId}`);
}
