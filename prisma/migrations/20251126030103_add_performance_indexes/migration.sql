-- CreateIndex
CREATE INDEX "Application_organizationId_status_updatedAt_idx" ON "Application"("organizationId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "Application_createdById_status_idx" ON "Application"("createdById", "status");

-- CreateIndex
CREATE INDEX "Application_submittedById_status_idx" ON "Application"("submittedById", "status");

-- CreateIndex
CREATE INDEX "Application_supplierId_idx" ON "Application"("supplierId");

-- CreateIndex
CREATE INDEX "ApplicationDocument_applicationId_idx" ON "ApplicationDocument"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationDocument_applicationId_documentTypeId_idx" ON "ApplicationDocument"("applicationId", "documentTypeId");

-- CreateIndex
CREATE INDEX "ApplicationDocument_uploadedById_idx" ON "ApplicationDocument"("uploadedById");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_applicationId_createdAt_idx" ON "AuditLog"("applicationId", "createdAt");
