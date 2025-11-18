import { describe, expect, it } from "vitest";

import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";

import { authOptions } from "@/lib/auth";

describe("auth session callback", () => {
  it("hydrates organization roles on the session payload", async () => {
    const sessionCallback = authOptions.callbacks?.session;

    if (!sessionCallback) {
      throw new Error("Session callback is undefined");
    }

    const mockRoles = [
      { organizationId: "org_1", role: "ADMIN" },
      { organizationId: "org_2", role: "MEMBER" },
    ];

    const baseSession = {
      user: {
        id: "",
        name: "Test User",
        email: "test@example.com",
        image: null,
        organizationRoles: [],
      },
      expires: new Date(Date.now() + 60_000).toISOString(),
    } satisfies Session;

    const token = {
      sub: undefined,
      organizationRoles: mockRoles,
    } satisfies Partial<JWT>;

    const result = await sessionCallback({
      session: structuredClone(baseSession),
      token,
      user: { id: "user_123" },
      trigger: "update",
      newSession: undefined,
    });

    expect(result).toBeTruthy();
    expect(result?.user.id).toBe("user_123");
    expect(result?.user.organizationRoles).toEqual(mockRoles);
  });
});

