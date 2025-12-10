import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: string; // "admin" or "user"
      // Impersonation fields
      isImpersonating?: boolean;
      impersonatedBy?: {
        id: string;
        email: string;
        name?: string | null;
      };
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name?: string | null;
    role?: string;
  }
}

