import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "./env";
import type { SessionUser } from "./types";

export const SESSION_COOKIE = "mk_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 jours

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(env.sessionSecret);

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, env.sessionSecret, { algorithms: ["HS256"] });
    return { id: Number(payload.sub), name: String(payload.name ?? "") };
  } catch {
    return null;
  }
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}
