import type { DefaultSession } from "next-auth";

type OrganizationRoleClaim = {
  organizationId: string;
  role: string;
};

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      organizationRoles: OrganizationRoleClaim[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    organizationRoles?: OrganizationRoleClaim[];
  }
}

