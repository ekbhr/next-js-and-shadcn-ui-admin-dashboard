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
      // For Google OAuth, create user if doesn't exist
      if (account?.provider === "google" && user.email) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });

          if (!existingUser) {
            // Create new user for Google OAuth
            await prisma.user.create({
              data: {
                email: user.email,
                name: user.name,
                image: user.image,
                emailVerified: new Date(),
              },
            });
          }
        } catch (error) {
          console.error("Error in signIn callback:", error);
          // Still allow sign in even if DB operation fails
          // The jwt callback will handle fetching/creating user
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        // For Google OAuth, fetch the user ID from database
        if (account?.provider === "google" && user.email) {
          try {
            let dbUser = await prisma.user.findUnique({
              where: { email: user.email },
            });
            
            // Create user if doesn't exist (fallback)
            if (!dbUser) {
              dbUser = await prisma.user.create({
                data: {
                  email: user.email,
                  name: user.name,
                  image: user.image,
                  emailVerified: new Date(),
                },
              });
            }
            
            token.id = dbUser.id;
          } catch (error) {
            console.error("Error in jwt callback:", error);
            // Use a temporary ID if database fails
            token.id = user.id || user.email;
          }
        } else {
          token.id = user.id;
        }
        token.email = user.email;
        token.name = user.name;
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
    async redirect({ url, baseUrl }) {
      // If the url is relative, prepend the base URL
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      // If the url is on the same origin, allow it
      if (url.startsWith(baseUrl)) {
        return url;
      }
      // Default redirect to dashboard
      return `${baseUrl}/dashboard`;
    },
  },
  secret: process.env.AUTH_SECRET,
  trustHost: true, // Required for custom domains like reporting.revengine.media
  debug: process.env.NODE_ENV === "development",
};

// Export auth function, handlers, and signOut for NextAuth v5
export const { auth, handlers, signOut } = NextAuth(authOptions);

