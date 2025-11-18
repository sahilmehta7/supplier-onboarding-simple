import { describe, it, expect, beforeEach, vi } from "vitest";
import { isAdmin, requireRole } from "@/lib/permissions";

const mockAuthFn = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuthFn,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: prismaMock.userFindUnique,
    },
  },
}));

const mockAuth = mockAuthFn;
const { userFindUnique } = prismaMock;

describe("permissions helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    userFindUnique.mockResolvedValue({
      memberships: [
        {
          organizationId: "org-1",
          role: "ADMIN",
        },
      ],
    });
  });

  it("detects admin role", async () => {
    expect(await isAdmin()).toBe(true);
  });

  it("allows allowed roles", async () => {
    await expect(requireRole(["ADMIN"]).then((m) => m.role)).resolves.toBe(
      "ADMIN"
    );
  });

  it("throws when role not permitted", async () => {
    userFindUnique.mockResolvedValue({
      memberships: [
        {
          organizationId: "org-1",
          role: "MEMBER",
        },
      ],
    });

    await expect(requireRole(["ADMIN"]).then(() => undefined)).rejects.toThrow(
      /insufficient role/
    );
  });
});
