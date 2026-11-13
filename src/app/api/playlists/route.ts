import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getUid } from "@/lib/firebase-session";
import { parseColor, userCollection } from "@/lib/library-server";
import type { PlaylistRec } from "@/lib/library-types";

function unauthorized() {
  return NextResponse.json({ error: "login_required" }, { status: 401 });
}

export async function GET() {
  const uid = await getUid();
  if (!uid) return unauthorized();
  const snap = await userCollection(uid, "playlists").orderBy("createdAt", "desc").get();
  return NextResponse.json(snap.docs.map((d) => d.data()));
}

export async function POST(req: Request) {
  const uid = await getUid();
  if (!uid) return unauthorized();
  const body = (await req.json().catch(() => null)) as { name?: unknown; color?: unknown; offline?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";
  const color = parseColor(body?.color);
  if (!name || !color) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const playlist: PlaylistRec = {
    id: randomUUID(),
    name,
    color,
    offline: body?.offline === true,
    songs: [],
    createdAt: Date.now(),
  };
  await userCollection(uid, "playlists").doc(playlist.id).set(playlist);
  return NextResponse.json(playlist);
}
