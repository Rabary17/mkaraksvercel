/** Types partagés par le client et le serveur : aucune dépendance navigateur ici. */
export interface SongLite {
  songId: number;
  title: string;
  artist: string;
  artistSlug?: string;
  url: string;
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
