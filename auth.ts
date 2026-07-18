import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { isEmailAllowed } from "@/lib/allowed-emails";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  trustHost: true,
  callbacks: {
    async signIn({ user, profile }) {
      const email = user.email?.trim().toLowerCase();
      if (!email) return false;

      const verified = (
        profile as { email_verified?: boolean } | undefined
      )?.email_verified;
      if (verified === false) return false;

      return isEmailAllowed(email);
    },
    async jwt({ token }) {
      const email =
        typeof token.email === "string"
          ? token.email.trim().toLowerCase()
          : undefined;

      if (!email || !isEmailAllowed(email)) {
        return {
          ...token,
          email: undefined,
          allowlisted: false,
        };
      }

      return {
        ...token,
        email,
        allowlisted: true,
      };
    },
    async session({ session, token }) {
      if (token.allowlisted !== true || !token.email) {
        return {
          ...session,
          user: undefined,
        };
      }

      if (session.user) {
        session.user.email = String(token.email);
        if (typeof token.name === "string") {
          session.user.name = token.name;
        }
      }

      return session;
    },
  },
});
