import { NextResponse } from "next/server";
import { getUid } from "@/lib/firebase-session";
import { getSongById } from "@/lib/wp";
import { deriveFileKey, safeObjectPath } from "@/lib/media-keys";
import { env } from "@/lib/env";
import { MEDIA_KINDS, type SongManifest } from "@/lib/types";

/**
 * Remet au lecteur, pour un utilisateur connecté, les adresses /media et les clés AES des 3 fichiers.
 * Les fichiers servis par /media sont chiffrés : sans cette réponse, ils sont inutilisables.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUid())) return NextResponse.json({ error: "login_required" }, { status: 401 });

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "bad_id" }, { status: 400 });

  const song = await getSongById(id);
  if (!song) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const files: SongManifest["files"] = {};
  for (const kind of MEDIA_KINDS) {
    const path = safeObjectPath(song.media[kind]);
    if (!path) continue;
    files[kind] = { src: `/media/${id}/${kind}`, key: deriveFileKey(path).toString("base64") };
  }
  if (!files.audio) return NextResponse.json({ error: "no_audio" }, { status: 404 });

  const manifest: SongManifest = {
    songId: id,
    title: song.title,
    artist: song.media.artist?.name ?? "",
    keyName: song.media.key,
    offlineUntil: Date.now() + env.offlineKeyDays * 86_400_000,
    files,
  };
  return NextResponse.json(manifest, { headers: { "Cache-Control": "private, no-store" } });
}
