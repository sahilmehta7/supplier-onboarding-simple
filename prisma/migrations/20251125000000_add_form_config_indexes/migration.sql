-- CreateIndex
CREATE INDEX "FormConfig_isActive_idx" ON "FormConfig"("isActive");

-- CreateIndex
CREATE INDEX "FormConfig_isActive_entityId_geographyId_idx" ON "FormConfig"("isActive", "entityId", "geographyId");
