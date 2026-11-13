import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getUid } from "@/lib/firebase-session";

const TITLE_FONTS = ["unbounded", "fraunces", "outfit", "inter"];
const LYRICS_FONTS = ["figtree", "fraunces", "outfit", "inter"];
const LYRICS_SIZES = ["small", "normal", "large"];
const HIGHLIGHTS = ["pink", "yellow", "teal", "white"];
const KARAOKE_BGS = ["violet", "dark"];

function prefsDoc(uid: string) {
  return adminDb.collection("users").doc(uid).collection("preferences").doc("main");
}

function parsePrefs(raw: unknown): Record<string, boolean | number | string> | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const out: Record<string, boolean | number | string> = {};
  if (typeof r.wifiOnly === "boolean") out.wifiOnly = r.wifiOnly;
  if (typeof r.showChords === "boolean") out.showChords = r.showChords;
  if (typeof r.lyricsDelay === "number" && Number.isFinite(r.lyricsDelay)) {
    out.lyricsDelay = Math.min(1.9, Math.max(0.1, Math.round(r.lyricsDelay * 10) / 10));
  }
  if (typeof r.titleFont === "string" && TITLE_FONTS.includes(r.titleFont)) out.titleFont = r.titleFont;
  if (typeof r.lyricsFont === "string" && LYRICS_FONTS.includes(r.lyricsFont)) out.lyricsFont = r.lyricsFont;
  if (typeof r.lyricsSize === "string" && LYRICS_SIZES.includes(r.lyricsSize)) out.lyricsSize = r.lyricsSize;
  if (typeof r.highlight === "string" && HIGHLIGHTS.includes(r.highlight)) out.highlight = r.highlight;
  if (typeof r.karaokeBg === "string" && KARAOKE_BGS.includes(r.karaokeBg)) out.karaokeBg = r.karaokeBg;
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
