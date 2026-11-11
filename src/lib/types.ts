export type MediaKind = "audio" | "lyrics" | "chord";
export const MEDIA_KINDS: MediaKind[] = ["audio", "lyrics", "chord"];

export interface Artist {
  id: number;
  slug: string;
  name: string;
  count: number;
}

/** Champ `mkaraks` ajouté à la REST API par le plugin WP mkaraks-headless. */
export interface SongMedia {
  artist: { id: number; name: string; slug: string } | null;
  audio: string | null;
  lyrics: string | null;
  chord: string | null;
  key: string | null; // tonalité, ex. "D Major"
  bpm: string | null; // get_post_meta renvoie une chaîne, ex. "85"
  genre: string | null; // casse non normalisée côté WordPress : "folk", "Reggae"
}

export interface Song {
  id: number;
  slug: string;
  title: string;
  lyricsHtml?: string;
  media: SongMedia;
}

export interface LyricWord {
  word: string;
  start: number;
  end: number;
}
export interface LyricLine {
  start: number;
  end: number;
  text: string;
  words: LyricWord[];
}
export interface ChordSegment {
  start: number;
  end: number;
  chord_majmin: string;
  chord_simple_pop?: string;
}

/** Réponse de /api/songs/[id]/manifest */
export interface SongManifest {
  songId: number;
  title: string;
  artist: string;
  keyName: string | null;
  /** Date (ms) jusqu'à laquelle les clés peuvent servir hors ligne. */
  offlineUntil: number;
  files: Partial<Record<MediaKind, { src: string; key: string }>>;
}

export interface SessionUser {
  id: number;
  name: string;
}
