import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getUid } from "@/lib/firebase-session";
import { MAX_SONGS_PER_PLAYLIST, parseFavorite, parsePlaylist, playlistRef, userCollection } from "@/lib/library-server";
import type { FavoriteRec, PlaylistRec } from "@/lib/library-types";

const MAX_FAVORITES = 1000;
const MAX_PLAYLISTS = 200;
const BATCH = 400;

export async function POST(req: Request) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "login_required" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { favorites?: unknown; playlists?: unknown } | null;
  const favs = body?.favorites;
  const pls = body?.playlists;
  const favorites = (Array.isArray(favs) ? favs.slice(0, MAX_FAVORITES) : [])
    .map(parseFavorite)
    .filter((f): f is FavoriteRec => f !== null);
  const playlists = (Array.isArray(pls) ? pls.slice(0, MAX_PLAYLISTS) : [])
    .map(parsePlaylist)
    .filter((p): p is PlaylistRec => p !== null);

  const favCol = userCollection(uid, "favorites");
  for (let i = 0; i < favorites.length; i += BATCH) {
    const chunk = favorites.slice(i, i + BATCH);
    const refs = chunk.map((f) => favCol.doc(f.key));
    const snaps = await adminDb.getAll(...refs);
    const batch = adminDb.batch();
    chunk.forEach((f, j) => {
      if (!snaps[j].exists) batch.set(refs[j], f);
    });
    await batch.commit();
  }

  for (const pl of playlists) {
    const ref = playlistRef(uid, pl.id);
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        tx.set(ref, pl);
        return;
      }
      const merged = [...(snap.data() as PlaylistRec).songs];
      for (const s of pl.songs) {
        if (merged.length >= MAX_SONGS_PER_PLAYLIST) break;
        if (!merged.some((m) => m.songId === s.songId)) merged.push(s);
      }
      tx.update(ref, { songs: merged });
    });
  }

  return NextResponse.json({ favorites: favorites.length, playlists: playlists.length });
}
