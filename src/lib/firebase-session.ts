import "server-only";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";

export async function getUid(): Promise<string | null> {
  const cookie = (await cookies()).get("__session")?.value;
  if (!cookie) return null;
  try {
    return (await adminAuth.verifySessionCookie(cookie, true)).uid;
  } catch {
    return null;
  }
}
