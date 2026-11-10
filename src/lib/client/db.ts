"use client";
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { SongManifest } from "@/lib/types";

/** Données minimales d'un titre, suffisantes pour l'afficher et le lancer hors ligne. */
export interface SongLite {
  songId: number;
  title: string;
  artist: string;
  artistSlug?: string;
  url: string;
}

export interface DownloadRec extends SongManifest {
  savedAt: number;
  bytes: number;
  pageUrl: string;
  artistSlug?: string;
}

export interface FavoriteRec {
  key: string; // "song:123" | "artist:slug"
  type: "song" | "artist";
  addedAt: number;
  song?: SongLite;
  artist?: { slug: string; name: string; count?: number };
}

export interface PlaylistRec {
  id: string;
  name: string;
  color: PlaylistColor;
  songs: SongLite[];
  offline: boolean;
  createdAt: number;
}

export const PLAYLIST_COLORS = ["yellow", "pink", "teal", "violet", "orange"] as const;
export type PlaylistColor = (typeof PLAYLIST_COLORS)[number];

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

/** Prévient l'interface qu'une donnée locale a changé. */
export const LIB_EVENT = "mk:library";
export function notifyLibrary() {
  window.dispatchEvent(new Event(LIB_EVENT));
}
