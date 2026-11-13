import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getUid } from "@/lib/firebase-session";
import { MAX_SONGS_PER_PLAYLIST, parseSong, playlistRef } from "@/lib/library-server";
import type { PlaylistRec } from "@/lib/library-types";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "login_required" }, { status: 401 });
  const song = parseSong(await req.json().catch(() => null));
  if (!song) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const ref = playlistRef(uid, (await params).id);
  const status = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return 404;
    const songs = (snap.data() as PlaylistRec).songs;
    if (songs.some((s) => s.songId === song.songId)) return 200;
    if (songs.length >= MAX_SONGS_PER_PLAYLIST) return 409;
    tx.update(ref, { songs: [...songs, song] });
    return 200;
  });
  return NextResponse.json({ ok: status === 200 }, { status });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "login_required" }, { status: 401 });
  const songId = Number(new URL(req.url).searchParams.get("songId"));
  if (!Number.isInteger(songId) || songId <= 0) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const ref = playlistRef(uid, (await params).id);
  const status = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return 404;
    const songs = (snap.data() as PlaylistRec).songs;
    tx.update(ref, { songs: songs.filter((s) => s.songId !== songId) });
    return 200;
  });
  return NextResponse.json({ ok: status === 200 }, { status });
}
