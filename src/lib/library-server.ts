import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { PLAYLIST_COLORS, type FavoriteRec, type PlaylistColor, type PlaylistRec, type SongLite } from "@/lib/library-types";

export const MAX_SONGS_PER_PLAYLIST = 500;

export function userCollection(uid: string, name: "favorites" | "playlists") {
  return adminDb.collection("users").doc(uid).collection(name);
}

export function playlistRef(uid: string, id: string) {
  return userCollection(uid, "playlists").doc(id);
}

export function parseSong(raw: unknown): SongLite | null {
  if (!raw || typeof raw !== "object") return null;
  const { songId, title, artist, artistSlug, url } = raw as Record<string, unknown>;
  if (typeof songId !== "number" || !Number.isInteger(songId) || songId <= 0) return null;
  if (typeof title !== "string" || typeof artist !== "string" || typeof url !== "string") return null;
  if (!url.startsWith("/") || url.startsWith("//")) return null;
  const song: SongLite = { songId, title: title.slice(0, 300), artist: artist.slice(0, 300), url: url.slice(0, 500) };
  if (typeof artistSlug === "string") song.artistSlug = artistSlug.slice(0, 200);
  return song;
}

export function parseArtist(raw: unknown): NonNullable<FavoriteRec["artist"]> | null {
  if (!raw || typeof raw !== "object") return null;
  const { slug, name, count } = raw as Record<string, unknown>;
  if (typeof slug !== "string" || slug.length === 0 || slug.length > 200 || slug.includes("/")) return null;
  if (typeof name !== "string") return null;
  const artist: NonNullable<FavoriteRec["artist"]> = { slug, name: name.slice(0, 300) };
  if (typeof count === "number" && Number.isFinite(count)) artist.count = count;
  return artist;
}

export function parseFavorite(raw: unknown): FavoriteRec | null {
  if (!raw || typeof raw !== "object") return null;
  const { type, song, artist, addedAt } = raw as Record<string, unknown>;
  const at = typeof addedAt === "number" && Number.isFinite(addedAt) ? addedAt : Date.now();
  if (type === "song") {
    const s = parseSong(song);
    return s ? { key: `song:${s.songId}`, type: "song", addedAt: at, song: s } : null;
  }
  if (type === "artist") {
    const a = parseArtist(artist);
    return a ? { key: `artist:${a.slug}`, type: "artist", addedAt: at, artist: a } : null;
  }
  return null;
}

export function parseColor(raw: unknown): PlaylistColor | null {
  return (PLAYLIST_COLORS as readonly unknown[]).includes(raw) ? (raw as PlaylistColor) : null;
}

export function parsePlaylist(raw: unknown): PlaylistRec | null {
  if (!raw || typeof raw !== "object") return null;
  const { id, name, color, offline, songs, createdAt } = raw as Record<string, unknown>;
  if (typeof id !== "string" || !/^[A-Za-z0-9-]{1,100}$/.test(id)) return null;
  const parsedColor = parseColor(color);
  if (typeof name !== "string" || !parsedColor) return null;
  const trimmed = name.trim().slice(0, 60);
  if (!trimmed) return null;
  const parsedSongs = Array.isArray(songs)
    ? songs.map(parseSong).filter((s): s is SongLite => s !== null).slice(0, MAX_SONGS_PER_PLAYLIST)
    : [];
  return {
    id,
    name: trimmed,
    color: parsedColor,
    offline: offline === true,
    songs: parsedSongs,
    createdAt: typeof createdAt === "number" && Number.isFinite(createdAt) ? createdAt : Date.now(),
  };
}
