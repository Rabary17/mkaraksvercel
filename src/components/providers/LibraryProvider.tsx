"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { db, LIB_EVENT, notifyLibrary, type DownloadRec, type FavoriteRec, type PlaylistColor, type PlaylistRec, type SongLite } from "@/lib/client/db";
import { downloadSong, removeDownload } from "@/lib/client/offline";

/**
 * Bibliothèque de l'utilisateur sur cet appareil : téléchargements, favoris, playlists.
 * TODO backend : synchroniser favoris et playlists avec WordPress pour « tous tes appareils ».
 */
interface Library {
  ready: boolean;
  downloads: DownloadRec[];
  downloaded: Set<number>;
  downloading: Map<number, string>;
  favorites: FavoriteRec[];
  isFavSong: (id: number) => boolean;
  isFavArtist: (slug: string) => boolean;
  toggleFavSong: (s: SongLite) => Promise<void>;
  toggleFavArtist: (a: { slug: string; name: string; count?: number }) => Promise<void>;
  download: (s: SongLite) => Promise<void>;
  removeDownload: (id: number) => Promise<void>;
  playlists: PlaylistRec[];
  createPlaylist: (p: { name: string; color: PlaylistColor; offline: boolean }) => Promise<PlaylistRec>;
  addToPlaylist: (id: string, s: SongLite) => Promise<void>;
  removeFromPlaylist: (id: string, songId: number) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
}

const Ctx = createContext<Library | null>(null);
export function useLibrary() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLibrary hors de <LibraryProvider>");
  return c;
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [downloads, setDownloads] = useState<DownloadRec[]>([]);
  const [favorites, setFavorites] = useState<FavoriteRec[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistRec[]>([]);
  const [downloading, setDownloading] = useState<Map<number, string>>(new Map());

  const load = useCallback(async () => {
    try {
      const d = await db();
      const [dl, fav, pl] = await Promise.all([d.getAll("songs"), d.getAll("favorites"), d.getAll("playlists")]);
      setDownloads(dl.sort((a, b) => b.savedAt - a.savedAt));
      setFavorites(fav.sort((a, b) => b.addedAt - a.addedAt));
      setPlaylists(pl.sort((a, b) => b.createdAt - a.createdAt));
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void load();
    window.addEventListener(LIB_EVENT, load);
    return () => window.removeEventListener(LIB_EVENT, load);
  }, [load]);

  const downloaded = useMemo(() => new Set(downloads.map((d) => d.songId)), [downloads]);
  const favSongs = useMemo(() => new Set(favorites.filter((f) => f.type === "song").map((f) => f.song!.songId)), [favorites]);
  const favArtists = useMemo(() => new Set(favorites.filter((f) => f.type === "artist").map((f) => f.artist!.slug)), [favorites]);

  const toggle = useCallback(async (rec: FavoriteRec) => {
    const d = await db();
    if (await d.get("favorites", rec.key)) await d.delete("favorites", rec.key);
    else await d.put("favorites", rec);
    notifyLibrary();
  }, []);

  const download = useCallback(async (s: SongLite) => {
    setDownloading((m) => new Map(m).set(s.songId, "0/3"));
    try {
      await downloadSong(s, (done, total) => setDownloading((m) => new Map(m).set(s.songId, `${done}/${total}`)));
    } finally {
      setDownloading((m) => {
        const n = new Map(m);
        n.delete(s.songId);
        return n;
      });
    }
  }, []);

  const savePlaylist = useCallback(async (p: PlaylistRec) => {
    await (await db()).put("playlists", p);
    notifyLibrary();
  }, []);

  const value: Library = {
    ready,
    downloads,
    downloaded,
    downloading,
    favorites,
    isFavSong: (id) => favSongs.has(id),
    isFavArtist: (slug) => favArtists.has(slug),
    toggleFavSong: (s) => toggle({ key: `song:${s.songId}`, type: "song", addedAt: Date.now(), song: s }),
    toggleFavArtist: (a) => toggle({ key: `artist:${a.slug}`, type: "artist", addedAt: Date.now(), artist: a }),
    download,
    removeDownload,
    playlists,
    async createPlaylist({ name, color, offline }) {
      const p: PlaylistRec = { id: crypto.randomUUID(), name, color, offline, songs: [], createdAt: Date.now() };
      await savePlaylist(p);
      return p;
    },
    async addToPlaylist(id, s) {
      const p = await (await db()).get("playlists", id);
      if (!p || p.songs.some((x) => x.songId === s.songId)) return;
      await savePlaylist({ ...p, songs: [...p.songs, s] });
      if (p.offline && !downloaded.has(s.songId)) void download(s).catch(() => {});
    },
    async removeFromPlaylist(id, songId) {
      const p = await (await db()).get("playlists", id);
      if (p) await savePlaylist({ ...p, songs: p.songs.filter((x) => x.songId !== songId) });
    },
    async deletePlaylist(id) {
      await (await db()).delete("playlists", id);
      notifyLibrary();
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
