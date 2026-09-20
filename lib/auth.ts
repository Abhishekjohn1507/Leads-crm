import { betterAuth } from "better-auth";
import { pool } from "./db";

export const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: false, // Can be toggled when email provider is configured
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  user: {
    changeEmail: {
      enabled: true,
    },
  },
  // Better Auth baseURL must point to the Next.js app host hosting the auth endpoints
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  secret:
    process.env.BETTER_AUTH_SECRET && !process.env.BETTER_AUTH_SECRET.startsWith("http")
      ? process.env.BETTER_AUTH_SECRET
      : "leadyfy_super_secure_enterprise_auth_secret_key_32_bytes_min",
});

export type Session = typeof auth.$Infer.Session;
