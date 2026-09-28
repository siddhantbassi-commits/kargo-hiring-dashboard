import { prisma } from "@/lib/db";
import { personalizeTemplate } from "./personalize";
import { getResendClient, getFromAddress, EmailConfigError } from "./resend-client";

export interface SendResult {
  ok: boolean;
  error?: string;
}

/**
 * Sends the candidate's current email draft via Resend. Never called
 * automatically — this is invoked exclusively by the founder clicking Send
 * on the candidate detail page (see the sendCandidateEmailAction server action).
 *
 * Duplicate-send protection: the draft is atomically claimed by flipping its
 * status from "draft" to "sending" via a conditional update. If zero rows are
 * affected, someone already claimed it (or it was never in "draft"), so we
 * bail out instead of sending twice.
 */
export async function sendCandidateEmail(candidateId: string): Promise<SendResult> {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: {
      privateDetails: true,
      emailDrafts: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!candidate) return { ok: false, error: "Candidate not found." };

  const draft = candidate.emailDrafts[0];
  if (!draft) return { ok: false, error: "No email draft exists for this candidate yet." };

  const recipient = candidate.privateDetails?.email;
  if (!recipient) {
    return {
      ok: false,
      error: "No email address was detected for this candidate. Add one manually before sending.",
    };
  }

  let fromAddress: string;
  let client: ReturnType<typeof getResendClient>;
  try {
    fromAddress = getFromAddress();
    client = getResendClient();
  } catch (error) {
    if (error instanceof EmailConfigError) return { ok: false, error: error.message };
    throw error;
  }

  const claim = await prisma.emailDraft.updateMany({
    where: { id: draft.id, status: "draft" },
    data: { status: "sending" },
  });
  if (claim.count === 0) {
    return { ok: false, error: "This email has already been sent (or is currently sending)." };
  }

  const firstName = candidate.privateDetails?.firstName ?? "there";
  const subject = personalizeTemplate(draft.editedSubject ?? draft.subject, firstName);
  const body = personalizeTemplate(draft.editedBody ?? draft.body, firstName);

  const sendRecord = await prisma.emailSend.create({
    data: { candidateId, emailDraftId: draft.id, recipient, status: "pending" },
  });

  try {
    const result = await client.emails.send({ from: fromAddress, to: recipient, subject, text: body });
    if (result.error) {
      throw new Error(result.error.message);
    }

    await prisma.$transaction([
      prisma.emailSend.update({
        where: { id: sendRecord.id },
        data: { resendMessageId: result.data?.id ?? null, sentAt: new Date(), status: "sent" },
      }),
      prisma.emailDraft.update({ where: { id: draft.id }, data: { status: "sent" } }),
    ]);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Resend error";
    await prisma.$transaction([
      prisma.emailSend.update({ where: { id: sendRecord.id }, data: { status: "failed", error: message } }),
      // Roll back to "draft" (not left stuck on "sending") so the founder can retry.
      prisma.emailDraft.update({ where: { id: draft.id }, data: { status: "draft" } }),
    ]);
    return { ok: false, error: message };
  }
}
