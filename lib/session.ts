import { auth } from "./auth";
import { headers } from "next/headers";

/**
 * Reusable server-side helper to retrieve the current authenticated session.
 */
export async function getSession() {
  const reqHeaders = await headers();
  return await auth.api.getSession({
    headers: reqHeaders,
  });
}

/**
 * Reusable server-side helper to get the currently authenticated user.
 * Returns the user object if authenticated, or null if unauthenticated.
 */
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}
