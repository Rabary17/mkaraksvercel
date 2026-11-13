import { NextResponse } from "next/server";
import { getUid } from "@/lib/firebase-session";
import { parseFavorite, userCollection } from "@/lib/library-server";

const KEY = /^(song:\d{1,12}|artist:[^/]{1,200})$/;

function unauthorized() {
  return NextResponse.json({ error: "login_required" }, { status: 401 });
}

export async function GET() {
  const uid = await getUid();
  if (!uid) return unauthorized();
  const snap = await userCollection(uid, "favorites").orderBy("addedAt", "desc").get();
  return NextResponse.json(snap.docs.map((d) => d.data()));
}

export async function POST(req: Request) {
  const uid = await getUid();
  if (!uid) return unauthorized();
  const body = await req.json().catch(() => null);
  const rec = parseFavorite({ ...body, addedAt: Date.now() });
  if (!rec) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  await userCollection(uid, "favorites").doc(rec.key).set(rec);
  return NextResponse.json(rec);
}

export async function DELETE(req: Request) {
  const uid = await getUid();
  if (!uid) return unauthorized();
  const key = new URL(req.url).searchParams.get("key") ?? "";
  if (!KEY.test(key)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  await userCollection(uid, "favorites").doc(key).delete();
  return NextResponse.json({ ok: true });
}
