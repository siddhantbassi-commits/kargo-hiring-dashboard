import type { RoleSlug } from "@prisma/client";
import { prisma } from "@/lib/db";
import { extractCvText } from "@/lib/extraction";
import { redactCv } from "@/lib/pii/redact";
import { getRoleBySlug } from "@/lib/rubric/repository";

export interface IngestCandidateParams {
  fileBuffer: Buffer;
  mimeType: string;
  originalFilename: string;
  appliedRoleSlug: RoleSlug;
}

/**
 * Extraction -> PII redaction -> persistence. Everything up to and including
 * this function runs before any network call to Gemini. The candidate row
 * this creates only ever stores sanitizedCvText; raw PII goes exclusively to
 * candidate_private_details (see lib/pii/redact.ts for the redaction logic).
 */
export async function ingestCandidate(params: IngestCandidateParams): Promise<{ candidateId: string }> {
  const role = await getRoleBySlug(params.appliedRoleSlug);

  const extraction = await extractCvText(params.fileBuffer, params.mimeType);
  const redaction = redactCv(extraction.text);

  const candidate = await prisma.candidate.create({
    data: {
      appliedRoleId: role.id,
      originalFilename: params.originalFilename,
      originalMimeType: params.mimeType,
      sanitizedCvText: redaction.sanitizedText,
      extractionWarning: redaction.warnings.length ? redaction.warnings.join(" ") : null,
      processingStatus: "extracting",
    },
  });

  await prisma.candidatePrivateDetails.create({
    data: {
      candidateId: candidate.id,
      fullName: redaction.pii.fullName,
      firstName: redaction.pii.firstName,
      email: redaction.pii.email,
      phone: redaction.pii.phone,
    },
  });

  await prisma.candidate.update({
    where: { id: candidate.id },
    data: { processingStatus: "redacting" },
  });

  return { candidateId: candidate.id };
}
