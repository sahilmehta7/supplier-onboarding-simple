-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "submissionType" TEXT,
ADD COLUMN     "submittedById" TEXT;

-- CreateIndex
CREATE INDEX "Application_organizationId_formConfigId_status_idx" ON "Application"("organizationId", "formConfigId", "status");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
