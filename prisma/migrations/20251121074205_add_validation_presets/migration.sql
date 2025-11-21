-- AlterTable
ALTER TABLE "FormField" ADD COLUMN     "externalValidator" TEXT,
ADD COLUMN     "validatorParams" JSONB;

-- CreateTable
CREATE TABLE "ValidationPreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rules" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValidationPreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ValidationPreset_name_key" ON "ValidationPreset"("name");
