"use client";
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { SongManifest } from "@/lib/types";
import type { FavoriteRec, PlaylistRec } from "@/lib/library-types";

export { PLAYLIST_COLORS, type FavoriteRec, type PlaylistColor, type PlaylistRec, type SongLite } from "@/lib/library-types";

/** Téléchargements hors ligne : fichiers chiffrés sur l'appareil. */
export interface DownloadRec extends SongManifest {
  savedAt: number;
  bytes: number;
  pageUrl: string;
  artistSlug?: string;
}

/** Favoris et playlists locaux d'avant le passage au compte : importés puis vidés au login. */
interface MkDB extends DBSchema {
  songs: { key: number; value: DownloadRec };
  favorites: { key: string; value: FavoriteRec };
  playlists: { key: string; value: PlaylistRec };
}

let dbPromise: Promise<IDBPDatabase<MkDB>> | null = null;

export function db() {
  dbPromise ??= openDB<MkDB>("mkaraks", 2, {
    upgrade(d, oldVersion) {
      if (oldVersion < 1) d.createObjectStore("songs", { keyPath: "songId" });
      if (oldVersion < 2) {
        d.createObjectStore("favorites", { keyPath: "key" });
        d.createObjectStore("playlists", { keyPath: "id" });
      }
    },
  });
  return dbPromise;
}

/** Copie hors ligne des favoris et playlists du compte (localStorage). */
export const LIBRARY_CACHE_KEY = "mk:library-cache";

/** Prévient l'interface qu'une donnée locale a changé. */
export const LIB_EVENT = "mk:library";
export function notifyLibrary() {
  window.dispatchEvent(new Event(LIB_EVENT));
}
