-- Align stored membership role values with Prisma enum casing
UPDATE "Membership"
SET "role" = CASE
  WHEN lower("role") = 'owner' THEN 'ADMIN'
  WHEN lower("role") = 'admin' THEN 'ADMIN'
  WHEN lower("role") = 'member' THEN 'MEMBER'
  WHEN lower("role") = 'supplier' THEN 'SUPPLIER'
  WHEN lower("role") = 'procurement' THEN 'PROCUREMENT'
  WHEN lower("role") = 'mdm' THEN 'MDM'
  ELSE upper("role")
END
WHERE "role" NOT IN ('ADMIN', 'MEMBER', 'SUPPLIER', 'PROCUREMENT', 'MDM');

ALTER TABLE "Membership"
ALTER COLUMN "role" SET DEFAULT 'MEMBER';

