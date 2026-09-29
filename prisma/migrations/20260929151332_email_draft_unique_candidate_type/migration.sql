-- AlterTable
ALTER TABLE "email_drafts" ADD CONSTRAINT "email_drafts_candidateId_emailType_key" UNIQUE ("candidateId", "emailType");
