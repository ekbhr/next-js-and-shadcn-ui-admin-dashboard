import NextAuth, { type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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
    async signIn({ user, account }) {
      console.log("[AUTH] signIn callback - provider:", account?.provider, "email:", user.email);
      // Always allow sign in - user creation happens in jwt callback
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        console.log("[AUTH] jwt callback - user:", user.email, "provider:", account?.provider);
        token.email = user.email;
        token.name = user.name;
        
        // For Google OAuth, try to get/create user in database
        if (account?.provider === "google" && user.email) {
          try {
            let dbUser = await prisma.user.findUnique({
              where: { email: user.email },
            });
            
            if (!dbUser) {
              console.log("[AUTH] Creating new user for:", user.email);
              dbUser = await prisma.user.create({
                data: {
                  email: user.email,
                  name: user.name || "",
                  image: user.image,
                  emailVerified: new Date(),
                },
              });
            }
            
            token.id = dbUser.id;
            console.log("[AUTH] User ID set:", dbUser.id);
          } catch (error) {
            console.error("[AUTH] Database error:", error);
            token.id = user.id || user.email || "temp-id";
          }
        } else {
          token.id = user.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
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

