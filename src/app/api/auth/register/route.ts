import { NextResponse } from "next/server";
import { wpRegister } from "@/lib/wp";
import { createSession } from "@/lib/session";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { name?: string; email?: string; password?: string } | null;
  const name = body?.name?.trim() ?? "";
  const email = body?.email?.trim() ?? "";
  const password = body?.password ?? "";

  if (!name || !email || !password) return NextResponse.json({ error: "Tous les champs sont requis." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Mot de passe : 8 caractères minimum." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });

  const result = await wpRegister(name, email, password);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

  await createSession(result);
  return NextResponse.json({ user: result });
}
