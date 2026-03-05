import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

function getIdentifierCandidates(rawIdentifier: string) {
  const normalized = rawIdentifier.trim().toLowerCase();

  if (!normalized) return [];

  if (normalized.includes("@")) {
    return Array.from(
      new Set([
        normalized,
        normalized.replace("@grifters.io", "@grifter.io"),
        normalized.replace("@grifter.io", "@grifters.io"),
      ]),
    );
  }

  return [`${normalized}@admin.local`, `${normalized}@grifter.io`, `${normalized}@grifters.io`];
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        identifier: { label: "Identifiant", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) return null;

        const candidates = getIdentifierCandidates(credentials.identifier);
        if (candidates.length === 0) return null;

        const user = await prisma.user.findFirst({
          where: {
            OR: candidates.map((value) => ({
              email: { equals: value, mode: "insensitive" as const },
            })),
          },
        });

        if (!user || user.role !== "ADMIN") return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as unknown as { role: string }).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as { role?: string; id?: string }).role = token.role as string;
        (session.user as { role?: string; id?: string }).id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
