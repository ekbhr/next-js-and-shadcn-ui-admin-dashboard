import NextAuth, { type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

const IMPERSONATION_COOKIE = "impersonation";

export const authOptions: NextAuthConfig = {
  providers: [
    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // Email/Password Provider
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) {
          throw new Error("Please enter your email and password");
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          throw new Error("Invalid email or password");
        }

        const isPasswordValid = await bcrypt.compare(
          password,
          user.password,
        );

        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    signOut: "/login",
  },
  callbacks: {
    async signIn() {
      // Always allow sign in - user creation happens in jwt callback
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
        
        // For Google OAuth, try to get/create user in database
        if (account?.provider === "google" && user.email) {
          try {
            let dbUser = await prisma.user.findUnique({
              where: { email: user.email },
            });
            
            if (!dbUser) {
              dbUser = await prisma.user.create({
                data: {
                  email: user.email,
                  name: user.name || "",
                  image: user.image,
                  emailVerified: new Date(),
                  role: "user", // Default role for new users
                },
              });
            }
            
            token.id = dbUser.id;
            token.role = dbUser.role;
          } catch {
            token.id = user.id || user.email || "temp-id";
            token.role = "user";
          }
        } else {
          token.id = user.id;
          // Fetch role from database for credentials login
          if (user.email) {
            const dbUser = await prisma.user.findUnique({
              where: { email: user.email },
              select: { role: true },
            });
            token.role = dbUser?.role || "user";
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Check for impersonation
        try {
          const cookieStore = await cookies();
          const impersonationCookie = cookieStore.get(IMPERSONATION_COOKIE);
          
          if (impersonationCookie?.value) {
            const impersonationData = JSON.parse(impersonationCookie.value);
            
            // Verify the admin making the request is the one who started impersonation
            if (impersonationData.adminId === token.id) {
              // Return impersonated user's session
              session.user.id = impersonationData.targetUserId;
              session.user.email = impersonationData.targetUserEmail;
              session.user.name = impersonationData.targetUserName;
              session.user.role = impersonationData.targetUserRole || "user";
              session.user.isImpersonating = true;
              session.user.impersonatedBy = {
                id: impersonationData.adminId,
                email: impersonationData.adminEmail,
                name: impersonationData.adminName,
              };
              return session;
            }
          }
        } catch {
          // Cookie parsing failed, continue with normal session
        }
        
        // Normal session (not impersonating)
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = (token.role as string) || "user";
        session.user.isImpersonating = false;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
  trustHost: true, // Required for custom domains like reporting.revengine.media
  debug: process.env.NODE_ENV === "development",
};

// Export auth function, handlers, and signOut for NextAuth v5
export const { auth, handlers, signOut } = NextAuth(authOptions);

