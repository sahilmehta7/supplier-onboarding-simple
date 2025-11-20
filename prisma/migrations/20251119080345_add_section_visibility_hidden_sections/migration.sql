-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "hiddenSections" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "FormSection" ADD COLUMN     "visibility" JSONB;
