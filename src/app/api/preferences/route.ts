import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getUid } from "@/lib/firebase-session";

function prefsDoc(uid: string) {
  return adminDb.collection("users").doc(uid).collection("preferences").doc("main");
}

function parsePrefs(raw: unknown): Record<string, boolean | number> | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const out: Record<string, boolean | number> = {};
  if (typeof r.wifiOnly === "boolean") out.wifiOnly = r.wifiOnly;
  if (typeof r.showChords === "boolean") out.showChords = r.showChords;
  if (typeof r.lyricsDelay === "number" && Number.isFinite(r.lyricsDelay)) {
    out.lyricsDelay = Math.min(1.9, Math.max(0.1, Math.round(r.lyricsDelay * 10) / 10));
  }
  return out;
}

export async function GET() {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "login_required" }, { status: 401 });
  const snap = await prefsDoc(uid).get();
  return NextResponse.json({ prefs: snap.exists ? snap.data() : null });
}

export async function PUT(req: Request) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "login_required" }, { status: 401 });
  const body = parsePrefs(await req.json().catch(() => null));
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  await prefsDoc(uid).set(body, { merge: true });
  return NextResponse.json({ ok: true });
}
