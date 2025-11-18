import { describe, it, expect, beforeEach, vi } from "vitest";
import { ensureUserMembership } from "@/lib/organizations";

const prismaMock = vi.hoisted(() => ({
  membershipFindFirst: vi.fn(),
  membershipCreate: vi.fn(),
  organizationFindUnique: vi.fn(),
  organizationCreate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    membership: {
      findFirst: prismaMock.membershipFindFirst,
      create: prismaMock.membershipCreate,
    },
    organization: {
      findUnique: prismaMock.organizationFindUnique,
      create: prismaMock.organizationCreate,
    },
  },
}));

const {
  membershipFindFirst,
  membershipCreate,
  organizationFindUnique,
  organizationCreate,
} = prismaMock;

describe("ensureUserMembership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing membership when present", async () => {
    const existing = { id: "m1" };
    membershipFindFirst.mockResolvedValue(existing);

    const result = await ensureUserMembership({
      userId: "user-1",
      userName: "Test User",
      userEmail: "test@example.com",
    });

    expect(result).toBe(existing);
    expect(organizationCreate).not.toHaveBeenCalled();
    expect(membershipCreate).not.toHaveBeenCalled();
  });

  it("creates organization and membership when missing", async () => {
    membershipFindFirst.mockResolvedValue(null);
    organizationFindUnique.mockResolvedValue(null);
    organizationCreate.mockResolvedValue({ id: "org-1" });
    const createdMembership = { id: "m2" };
    membershipCreate.mockResolvedValue(createdMembership);

    const result = await ensureUserMembership({
      userId: "user-2",
      userName: "Jane Doe",
      userEmail: "jane@example.com",
    });

    expect(organizationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: expect.stringContaining("Jane") }),
      })
    );
    expect(membershipCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "user-2" }) })
    );
    expect(result).toBe(createdMembership);
  });
});
