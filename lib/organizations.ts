import { prisma } from "@/lib/prisma";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 30);
}

async function generateUniqueSlug(base: string) {
  const slugBase = slugify(base) || "workspace";
  let slug = slugBase;
  let counter = 1;

  while (true) {
    const existing = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }

    slug = `${slugBase}-${counter}`;
    counter += 1;
  }
}

export async function ensureUserMembership(options: {
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
}) {
  const { userId, userName, userEmail } = options;

  const existingMembership = await prisma.membership.findFirst({
    where: { userId },
  });

  if (existingMembership) {
    return existingMembership;
  }

  const organizationName = userName
    ? `${userName.split(" ")[0]}'s Workspace`
    : userEmail?.split("@")[0]?.concat("'s Workspace") ?? "Personal Workspace";

  const slug = await generateUniqueSlug(organizationName);

  const organization = await prisma.organization.create({
    data: {
      name: organizationName,
      slug,
    },
  });

  const membership = await prisma.membership.create({
    data: {
      userId,
      organizationId: organization.id,
      role: "ADMIN",
    },
  });

  return membership;
}
