"use client";
import type { MediaKind, SongManifest } from "@/lib/types";
import { db, LIBRARY_CACHE_KEY, notifyLibrary, type SongLite } from "./db";
import { getPrefs } from "./prefs";
import { ensureOfflineDecoder } from "./decrypt";

/**
 * Téléchargements hors ligne :
 *  - fichiers CHIFFRÉS dans le Cache API "mkaraks-media" (clé = /media/{id}/{type})
 *  - manifeste (titre + clés AES + date d'expiration) dans IndexedDB
 * Les fichiers restent chiffrés sur l'appareil ; sans manifeste valide ils sont illisibles.
 */
const MEDIA_CACHE = "mkaraks-media";
/** Sans le suffixe de version : les téléchargements déjà faits restent retrouvés. */
const cacheKey = (src: string) => src.split("?")[0];

export class LoginRequiredError extends Error {
  constructor() {
    super("login_required");
  }
}
export class WifiOnlyError extends Error {
  constructor() {
    super("wifi_only");
  }
}

export async function fetchManifest(songId: number): Promise<SongManifest> {
  const res = await fetch(`/api/songs/${songId}/manifest`, { credentials: "same-origin", cache: "no-store" });
  if (res.status === 401) throw new LoginRequiredError();
  if (!res.ok) throw new Error(`manifest ${res.status}`);
  return res.json();
}

export async function getOfflineManifest(songId: number) {
  const m = await (await db()).get("songs", songId);
  return m && m.offlineUntil > Date.now() ? m : null;
}

/** Manifeste : réseau d'abord (rafraîchit les clés locales), repli hors ligne. */
export async function resolveManifest(songId: number): Promise<SongManifest> {
  try {
    const m = await fetchManifest(songId);
    const d = await db();
    const local = await d.get("songs", songId);
    if (local) await d.put("songs", { ...local, ...m });
    return m;
  } catch (e) {
    const local = await getOfflineManifest(songId);
    if (local) return local;
    throw e;
  }
}

export async function getEncryptedFile(src: string): Promise<ArrayBuffer> {
  const cache = await caches.open(MEDIA_CACHE);
  const hit = await cache.match(cacheKey(src));
  if (hit) return hit.arrayBuffer();
  const res = await fetch(src, { credentials: "same-origin" });
  if (res.status === 401) throw new LoginRequiredError();
  if (!res.ok) throw new Error(`media ${res.status}`);
  return res.arrayBuffer();
}

/** Réseau mobile détectable uniquement sur Android/Chrome (Network Information API). */
function onCellular() {
  const c = (navigator as Navigator & { connection?: { type?: string } }).connection;
  return c?.type === "cellular";
}

export async function downloadSong(song: SongLite, onProgress?: (done: number, total: number) => void) {
  if (getPrefs().wifiOnly && onCellular()) throw new WifiOnlyError();
  const manifest = await fetchManifest(song.songId);
  await ensureOfflineDecoder();
  const cache = await caches.open(MEDIA_CACHE);
  const entries = Object.entries(manifest.files) as [MediaKind, { src: string }][];
  let bytes = 0;
  let done = 0;
  for (const [, f] of entries) {
    const res = await fetch(f.src, { credentials: "same-origin" });
    if (!res.ok) throw new Error(`media ${res.status}`);
    const blob = await res.blob();
    bytes += blob.size;
    await cache.put(cacheKey(f.src), new Response(blob, { headers: { "Content-Type": "application/octet-stream" } }));
    onProgress?.(++done, entries.length);
  }
  await (await db()).put("songs", { ...manifest, savedAt: Date.now(), bytes, pageUrl: song.url, artistSlug: song.artistSlug });
  if (navigator.storage?.persist) await navigator.storage.persist().catch(() => false);
  notifyLibrary();
}

export async function removeDownload(songId: number) {
  const d = await db();
  const m = await d.get("songs", songId);
  if (!m) return;
  const cache = await caches.open(MEDIA_CACHE);
  await Promise.all(Object.values(m.files).map((f) => f && cache.delete(cacheKey(f.src))));
  await d.delete("songs", songId);
  notifyLibrary();
}

export async function listDownloads() {
  return (await db()).getAll("songs");
}

/** À la déconnexion : on efface les téléchargements et la copie hors ligne de la bibliothèque. */
export async function clearAllDownloads() {
  await caches.delete(MEDIA_CACHE);
  await (await db()).clear("songs");
  try {
    localStorage.removeItem(LIBRARY_CACHE_KEY);
  } catch {}
  notifyLibrary();
}
