-- CreateIndex
CREATE INDEX "candidate_scores_roleId_totalScore_idx" ON "candidate_scores"("roleId", "totalScore");

-- CreateIndex
CREATE INDEX "candidates_appliedRoleId_processingStatus_idx" ON "candidates"("appliedRoleId", "processingStatus");

-- CreateIndex
CREATE INDEX "criterion_scores_candidateScoreId_idx" ON "criterion_scores"("candidateScoreId");
