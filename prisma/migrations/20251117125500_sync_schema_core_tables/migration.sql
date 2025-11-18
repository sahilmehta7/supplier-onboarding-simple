-- Align Membership.role with enum casing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'MembershipRole'
  ) THEN
    CREATE TYPE "MembershipRole" AS ENUM (
      'ADMIN',
      'MEMBER',
      'SUPPLIER',
      'PROCUREMENT',
      'MDM'
    );
  END IF;
END
$$;

ALTER TABLE "Membership"
  ALTER COLUMN "role" DROP DEFAULT,
  ALTER COLUMN "role" TYPE "MembershipRole" USING upper("role")::"MembershipRole",
  ALTER COLUMN "role" SET DEFAULT 'MEMBER';

-- Application status enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'ApplicationStatus'
  ) THEN
    CREATE TYPE "ApplicationStatus" AS ENUM (
      'DRAFT',
      'SUBMITTED',
      'IN_REVIEW',
      'PENDING_SUPPLIER',
      'APPROVED',
      'REJECTED'
    );
  END IF;
END
$$;

-- Core catalog tables
CREATE TABLE IF NOT EXISTS "Entity" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Entity_code_key" ON "Entity"("code");

CREATE TABLE IF NOT EXISTS "Geography" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Geography_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Geography_code_key" ON "Geography"("code");

CREATE TABLE IF NOT EXISTS "EntityGeography" (
  "id" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "geographyId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EntityGeography_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EntityGeography_entityId_geographyId_key"
  ON "EntityGeography"("entityId", "geographyId");

CREATE TABLE IF NOT EXISTS "FormConfig" (
  "id" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "geographyId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "title" TEXT,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FormConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FormConfig_entityId_geographyId_version_key"
  ON "FormConfig"("entityId", "geographyId", "version");

CREATE TABLE IF NOT EXISTS "FormSection" (
  "id" TEXT NOT NULL,
  "formConfigId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FormSection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FormField" (
  "id" TEXT NOT NULL,
  "sectionId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "placeholder" TEXT,
  "helpText" TEXT,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "options" JSONB,
  "validation" JSONB,
  "visibility" JSONB,
  "order" INTEGER NOT NULL DEFAULT 0,
  "isSensitive" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FormField_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FormField_sectionId_key_key"
  ON "FormField"("sectionId", "key");

CREATE TABLE IF NOT EXISTS "DocumentType" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DocumentType_key_key" ON "DocumentType"("key");

CREATE TABLE IF NOT EXISTS "FormDocumentRequirement" (
  "id" TEXT NOT NULL,
  "formConfigId" TEXT NOT NULL,
  "documentTypeId" TEXT NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "helpText" TEXT,
  CONSTRAINT "FormDocumentRequirement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FormDocumentRequirement_formConfigId_documentTypeId_key"
  ON "FormDocumentRequirement"("formConfigId", "documentTypeId");

CREATE TABLE IF NOT EXISTS "Application" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "geographyId" TEXT NOT NULL,
  "formConfigId" TEXT,
  "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "data" JSONB,
  "submittedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "pendingSince" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Application_organizationId_idx" ON "Application"("organizationId");
CREATE INDEX IF NOT EXISTS "Application_entityId_idx" ON "Application"("entityId");
CREATE INDEX IF NOT EXISTS "Application_geographyId_idx" ON "Application"("geographyId");
CREATE INDEX IF NOT EXISTS "Application_status_idx" ON "Application"("status");

CREATE TABLE IF NOT EXISTS "ApplicationDocument" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "documentTypeId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "mimeType" TEXT,
  "fileSize" INTEGER,
  "uploadedById" TEXT NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApplicationDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ApplicationComment" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "visibility" TEXT NOT NULL DEFAULT 'supplier_visible',
  "fieldKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApplicationComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ApplicationComment_applicationId_idx"
  ON "ApplicationComment"("applicationId");

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "actorRole" "MembershipRole",
  "organizationId" TEXT,
  "applicationId" TEXT,
  "action" TEXT NOT NULL,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");
CREATE INDEX IF NOT EXISTS "AuditLog_applicationId_idx" ON "AuditLog"("applicationId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- Foreign keys
ALTER TABLE "EntityGeography"
  ADD CONSTRAINT "EntityGeography_entityId_fkey"
    FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "EntityGeography_geographyId_fkey"
    FOREIGN KEY ("geographyId") REFERENCES "Geography"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FormConfig"
  ADD CONSTRAINT "FormConfig_entityId_fkey"
    FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "FormConfig_geographyId_fkey"
    FOREIGN KEY ("geographyId") REFERENCES "Geography"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FormSection"
  ADD CONSTRAINT "FormSection_formConfigId_fkey"
    FOREIGN KEY ("formConfigId") REFERENCES "FormConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FormField"
  ADD CONSTRAINT "FormField_sectionId_fkey"
    FOREIGN KEY ("sectionId") REFERENCES "FormSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FormDocumentRequirement"
  ADD CONSTRAINT "FormDocumentRequirement_formConfigId_fkey"
    FOREIGN KEY ("formConfigId") REFERENCES "FormConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "FormDocumentRequirement_documentTypeId_fkey"
    FOREIGN KEY ("documentTypeId") REFERENCES "DocumentType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Application"
  ADD CONSTRAINT "Application_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "Application_entityId_fkey"
    FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "Application_geographyId_fkey"
    FOREIGN KEY ("geographyId") REFERENCES "Geography"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "Application_formConfigId_fkey"
    FOREIGN KEY ("formConfigId") REFERENCES "FormConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Application_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Application_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ApplicationDocument"
  ADD CONSTRAINT "ApplicationDocument_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ApplicationDocument_documentTypeId_fkey"
    FOREIGN KEY ("documentTypeId") REFERENCES "DocumentType"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ApplicationDocument_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApplicationComment"
  ADD CONSTRAINT "ApplicationComment_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ApplicationComment_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "AuditLog_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "AuditLog_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

