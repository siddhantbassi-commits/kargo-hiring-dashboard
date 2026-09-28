import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

/**
 * Single-founder auth: no user table, no signup flow. The one allowed
 * account is defined entirely by FOUNDER_EMAIL / FOUNDER_PASSWORD_HASH env
 * vars (see scripts/hash-password.ts to generate the hash). This is
 * intentionally minimal per the spec — one authenticated admin is enough
 * for a one-person internal tool.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        const founderEmail = process.env.FOUNDER_EMAIL;
        const founderPasswordHash = process.env.FOUNDER_PASSWORD_HASH;
        if (!founderEmail || !founderPasswordHash) {
          console.error("FOUNDER_EMAIL / FOUNDER_PASSWORD_HASH are not configured.");
          return null;
        }

        if (email.trim().toLowerCase() !== founderEmail.trim().toLowerCase()) return null;

        const valid = await bcrypt.compare(password, founderPasswordHash);
        if (!valid) return null;

        return { id: "founder", email: founderEmail, name: "Founder" };
      },
    }),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  trustHost: true,
});
