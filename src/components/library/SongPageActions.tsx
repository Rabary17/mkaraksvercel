"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SongLite } from "@/lib/client/db";
import { usePlayer } from "@/components/player/PlayerProvider";
import { useLibrary } from "@/components/providers/LibraryProvider";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { PLAYLIST_BG } from "./playlist-colors";
import { LoginRequiredError, WifiOnlyError } from "@/lib/client/offline";

/** Boutons de la page chanson : Chanter · Télécharger · Favori · Ajouter à une playlist. */
export function SongPageActions({ song }: { song: SongLite }) {
  const router = useRouter();
  const { play, setExpanded } = usePlayer();
  const lib = useLibrary();
  const [plOpen, setPlOpen] = useState(false);
  const isDl = lib.downloaded.has(song.songId);
  const progress = lib.downloading.get(song.songId);
  const isFav = lib.isFavSong(song.songId);

  async function onDownload() {
    if (isDl) return lib.removeDownload(song.songId);
    try {
      await lib.download(song);
    } catch (e) {
      if (e instanceof LoginRequiredError) router.push("/connexion");
      else if (e instanceof WifiOnlyError) alert("Téléchargement en Wi-Fi seulement : connecte-toi à un Wi-Fi ou change le réglage dans « Hors ligne ».");
      else alert("Le téléchargement a échoué. Réessaie.");
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => {
            void play(song);
            setExpanded(true);
          }}
          className="btn-primary w-full sm:w-auto"
        >
          <Icon name="mic" filled size={26} /> Chanter
        </button>
        <button onClick={onDownload} disabled={!!progress} className="btn-outline h-14 flex-1 px-5 text-base sm:flex-none">
          {progress ? (
            <>
              <span className="size-5 animate-spin rounded-full border-2 border-teal/30 border-t-teal" /> {progress}
            </>
          ) : (
            <>
              <Icon name={isDl ? "download_done" : "download"} size={24} className={isDl ? "text-teal" : ""} />
              {isDl ? "Hors ligne" : "Télécharger"}
            </>
          )}
        </button>
        <button onClick={() => lib.toggleFavSong(song)} className="icon-btn size-14" aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}>
          <Icon name="favorite" filled={isFav} size={26} className="text-pink" />
        </button>
        <button onClick={() => (lib.loggedIn ? setPlOpen(true) : router.push("/connexion"))} className="icon-btn size-14" aria-label="Ajouter à une playlist">
          <Icon name="playlist_add" size={26} />
        </button>
      </div>

      <Sheet open={plOpen} onClose={() => setPlOpen(false)} title="Ajouter à…">
        {lib.playlists.length === 0 ? (
          <p className="mb-5 text-muted">Tu n’as pas encore de playlist.</p>
        ) : (
          <ul className="mb-5 max-h-[45dvh] space-y-2 overflow-y-auto">
            {lib.playlists.map((pl) => {
              const has = pl.songs.some((s) => s.songId === song.songId);
              return (
                <li key={pl.id}>
                  <button
                    disabled={has}
                    onClick={async () => {
                      await lib.addToPlaylist(pl.id, song);
                      setPlOpen(false);
                    }}
                    className="card flex w-full items-center gap-3 p-2.5 text-left disabled:opacity-60"
                  >
                    <span className={`grid size-11 place-items-center rounded-[14px] ${PLAYLIST_BG[pl.color]}`}>
                      <Icon name="queue_music" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-extrabold">{pl.name}</span>
                      <span className="block text-sm text-muted">{pl.songs.length} titres</span>
                    </span>
                    {has && <Icon name="check" className="text-teal" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <button onClick={() => router.push("/playlists?nouvelle=1")} className="btn-ink w-full">
          <Icon name="add" /> Nouvelle playlist
        </button>
      </Sheet>
    </>
  );
}
