"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/providers/UserProvider";
import { db, LIB_EVENT, LIBRARY_CACHE_KEY, type DownloadRec, type FavoriteRec, type PlaylistColor, type PlaylistRec, type SongLite } from "@/lib/client/db";
import { downloadSong, removeDownload } from "@/lib/client/offline";
import { syncPrefs } from "@/lib/client/prefs";

/**
 * Favoris et playlists : la source de vérité est le compte (Firestore, via l'API).
 * Le cache local ne sert qu'hors ligne. Les téléchargements restent sur l'appareil.
 */
interface Library {
  ready: boolean;
  loggedIn: boolean;
  downloads: DownloadRec[];
  downloaded: Set<number>;
  downloading: Map<number, string>;
  download: (s: SongLite) => Promise<void>;
  removeDownload: (id: number) => Promise<void>;
  favorites: FavoriteRec[];
  isFavSong: (id: number) => boolean;
  isFavArtist: (slug: string) => boolean;
  toggleFavSong: (s: SongLite) => Promise<void>;
  toggleFavArtist: (a: { slug: string; name: string; count?: number }) => Promise<void>;
  playlists: PlaylistRec[];
  createPlaylist: (p: { name: string; color: PlaylistColor; offline: boolean }) => Promise<PlaylistRec | null>;
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

type Cache = { userId: string; favorites: FavoriteRec[]; playlists: PlaylistRec[] };

function readCache(userId: string): Pick<Cache, "favorites" | "playlists"> {
  try {
    const c = JSON.parse(localStorage.getItem(LIBRARY_CACHE_KEY) ?? "null") as Cache | null;
    if (c && c.userId === userId && Array.isArray(c.favorites) && Array.isArray(c.playlists)) return c;
  } catch {}
  return { favorites: [], playlists: [] };
}

async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init, headers: { "Content-Type": "application/json" } });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json() as Promise<T>;
}

/** Ancien stockage local (avant le compte) : envoyé au serveur une fois, puis vidé. */
async function importLegacyLibrary() {
  const d = await db();
  const [favorites, playlists] = await Promise.all([d.getAll("favorites"), d.getAll("playlists")]);
  if (favorites.length === 0 && playlists.length === 0) return;
  await api("/api/library/import", { method: "POST", body: JSON.stringify({ favorites, playlists }) });
  await Promise.all([d.clear("favorites"), d.clear("playlists")]);
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useUser();
  const sessionPending = user === undefined;
  const uidKey = user ? String(user.id) : null;
  const loggedIn = !!user;

  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const ready = !sessionPending && (uidKey === null || loadedFor === uidKey);
  const [downloads, setDownloads] = useState<DownloadRec[]>([]);
  const [favorites, setFavorites] = useState<FavoriteRec[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistRec[]>([]);
  const [downloading, setDownloading] = useState<Map<number, string>>(new Map());

  const loadDownloads = useCallback(async () => {
    const dl = await (await db()).getAll("songs");
    setDownloads(dl.sort((a, b) => b.savedAt - a.savedAt));
  }, []);

  useEffect(() => {
    void loadDownloads();
    window.addEventListener(LIB_EVENT, loadDownloads);
    return () => window.removeEventListener(LIB_EVENT, loadDownloads);
  }, [loadDownloads]);

  useEffect(() => {
    if (sessionPending) return;
    if (uidKey === null) {
      setFavorites([]);
      setPlaylists([]);
      setLoadedFor(null);
      return;
    }
    let cancelled = false;
    setFavorites([]);
    setPlaylists([]);
    void syncPrefs();
    (async () => {
      await importLegacyLibrary().catch(() => {});
      try {
        const [f, p] = await Promise.all([api<FavoriteRec[]>("/api/favoris"), api<PlaylistRec[]>("/api/playlists")]);
        if (cancelled) return;
        setFavorites(f);
        setPlaylists(p);
      } catch {
        if (cancelled) return;
        const c = readCache(uidKey);
        setFavorites(c.favorites);
        setPlaylists(c.playlists);
      } finally {
        if (!cancelled) setLoadedFor(uidKey);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionPending, uidKey]);

  useEffect(() => {
    if (uidKey === null || loadedFor !== uidKey) return;
    try {
      localStorage.setItem(LIBRARY_CACHE_KEY, JSON.stringify({ userId: uidKey, favorites, playlists }));
    } catch {}
  }, [uidKey, loadedFor, favorites, playlists]);

  const downloaded = useMemo(() => new Set(downloads.map((d) => d.songId)), [downloads]);
  const favSongs = useMemo(
    () => new Set(favorites.flatMap((f) => (f.type === "song" && f.song ? [f.song.songId] : []))),
    [favorites],
  );
  const favArtists = useMemo(
    () => new Set(favorites.flatMap((f) => (f.type === "artist" && f.artist ? [f.artist.slug] : []))),
    [favorites],
  );

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

  const requireLogin = useCallback(() => router.push("/connexion"), [router]);

  const toggleFav = useCallback(
    async (rec: FavoriteRec) => {
      if (!loggedIn) return requireLogin();
      const exists = favorites.some((f) => f.key === rec.key);
      const previous = favorites;
      setFavorites(exists ? previous.filter((f) => f.key !== rec.key) : [rec, ...previous]);
      try {
        if (exists) await api(`/api/favoris?key=${encodeURIComponent(rec.key)}`, { method: "DELETE" });
        else await api("/api/favoris", { method: "POST", body: JSON.stringify({ type: rec.type, song: rec.song, artist: rec.artist }) });
      } catch {
        setFavorites(previous);
        alert("Impossible de modifier tes favoris pour l'instant. Vérifie ta connexion.");
      }
    },
    [favorites, loggedIn, requireLogin],
  );

  const toggleFavSong = useCallback(
    (s: SongLite) => toggleFav({ key: `song:${s.songId}`, type: "song", addedAt: Date.now(), song: s }),
    [toggleFav],
  );
  const toggleFavArtist = useCallback(
    (a: { slug: string; name: string; count?: number }) =>
      toggleFav({ key: `artist:${a.slug}`, type: "artist", addedAt: Date.now(), artist: a }),
    [toggleFav],
  );

  const createPlaylist = useCallback(
    async ({ name, color, offline }: { name: string; color: PlaylistColor; offline: boolean }) => {
      if (!loggedIn) {
        requireLogin();
        return null;
      }
      try {
        const pl = await api<PlaylistRec>("/api/playlists", { method: "POST", body: JSON.stringify({ name, color, offline }) });
        setPlaylists((ps) => [pl, ...ps]);
        return pl;
      } catch {
        alert("Impossible de créer la playlist pour l'instant. Vérifie ta connexion.");
        return null;
      }
    },
    [loggedIn, requireLogin],
  );

  const addToPlaylist = useCallback(
    async (id: string, s: SongLite) => {
      if (!loggedIn) return requireLogin();
      const pl = playlists.find((p) => p.id === id);
      if (!pl || pl.songs.some((x) => x.songId === s.songId)) return;
      const previous = playlists;
      setPlaylists(previous.map((p) => (p.id === id ? { ...p, songs: [...p.songs, s] } : p)));
      try {
        await api(`/api/playlists/${id}/songs`, { method: "POST", body: JSON.stringify(s) });
      } catch {
        setPlaylists(previous);
        alert("Impossible d'ajouter ce titre pour l'instant. Vérifie ta connexion.");
        return;
      }
      if (pl.offline && !downloaded.has(s.songId)) void download(s).catch(() => {});
    },
    [download, downloaded, loggedIn, playlists, requireLogin],
  );

  const removeFromPlaylist = useCallback(
    async (id: string, songId: number) => {
      if (!loggedIn) return requireLogin();
      const previous = playlists;
      setPlaylists(previous.map((p) => (p.id === id ? { ...p, songs: p.songs.filter((x) => x.songId !== songId) } : p)));
      try {
        await api(`/api/playlists/${id}/songs?songId=${songId}`, { method: "DELETE" });
      } catch {
        setPlaylists(previous);
        alert("Impossible de retirer ce titre pour l'instant. Vérifie ta connexion.");
      }
    },
    [loggedIn, playlists, requireLogin],
  );

  const deletePlaylist = useCallback(
    async (id: string) => {
      if (!loggedIn) return requireLogin();
      const previous = playlists;
      setPlaylists(previous.filter((p) => p.id !== id));
      try {
        await api(`/api/playlists/${id}`, { method: "DELETE" });
      } catch {
        setPlaylists(previous);
        alert("Impossible de supprimer la playlist pour l'instant. Vérifie ta connexion.");
      }
    },
    [loggedIn, playlists, requireLogin],
  );

  const value: Library = {
    ready,
    loggedIn,
    downloads,
    downloaded,
    downloading,
    download,
    removeDownload,
    favorites,
    isFavSong: (id) => favSongs.has(id),
    isFavArtist: (slug) => favArtists.has(slug),
    toggleFavSong,
    toggleFavArtist,
    playlists,
    createPlaylist,
    addToPlaylist,
    removeFromPlaylist,
    deletePlaylist,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
