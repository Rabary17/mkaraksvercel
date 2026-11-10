import { NextResponse } from "next/server";
import { wpLogin } from "@/lib/wp";
import { createSession } from "@/lib/session";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { username?: string; password?: string } | null;
  if (!body?.username || !body?.password) {
    return NextResponse.json({ error: "Identifiant et mot de passe requis." }, { status: 400 });
  }
  const user = await wpLogin(body.username, body.password);
  if (!user) {
    return NextResponse.json({ error: "Identifiant ou mot de passe incorrect." }, { status: 401 });
  }
  await createSession(user);
  return NextResponse.json({ user });
}
