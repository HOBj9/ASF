import type { DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role?: any;
      avatar?: string | null;
      branchId?: string | null;
      organizationId?: string | null;
      trackingVehicleId?: string | null;
      isActive?: boolean;
      originalAdminId?: string;
      originalAdminName?: string;
      originalAdminEmail?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    role?: any;
    avatar?: string | null;
    branchId?: string | null;
    organizationId?: string | null;
    trackingVehicleId?: string | null;
    isActive?: boolean;
    originalAdminId?: string;
    originalAdminName?: string;
    originalAdminEmail?: string;
  }
}
