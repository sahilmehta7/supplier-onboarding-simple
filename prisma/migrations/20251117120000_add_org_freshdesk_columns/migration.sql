-- Extend organizations with Freshdesk integration fields
ALTER TABLE "Organization"
ADD COLUMN "freshdeskDomain" TEXT,
ADD COLUMN "freshdeskApiKey" TEXT,
ADD COLUMN "emailTemplate" TEXT;

