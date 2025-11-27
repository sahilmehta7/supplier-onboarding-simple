-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "ocrProcessed" JSONB;

-- AlterTable
ALTER TABLE "ApplicationDocument" ADD COLUMN     "ocrError" TEXT,
ADD COLUMN     "ocrExtractedData" JSONB,
ADD COLUMN     "ocrProcessedAt" TIMESTAMP(3),
ADD COLUMN     "ocrStatus" TEXT DEFAULT 'pending';
