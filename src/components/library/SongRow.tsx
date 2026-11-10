"use client";
import Link from "next/link";
import type { SongLite } from "@/lib/client/db";
import { Icon } from "@/components/ui/Icon";
import { LetterTile } from "@/components/ui/LetterTile";
import { usePlayer } from "@/components/player/PlayerProvider";
import { useLibrary } from "@/components/providers/LibraryProvider";
import { LoginRequiredError, WifiOnlyError } from "@/lib/client/offline";
import { useRouter } from "next/navigation";

/**
 * Ligne de titre (écrans 03, 06, 08) :
 * vignette-initiale · titre/artiste · état téléchargement · cœur.
 * Cliquer sur la ligne lance le karaoké ; le titre mène à la page de la chanson.
 */
export function SongRow({
  song,
  queue,
  showDownload = true,
  showFavorite = true,
  trailing,
}: {
  song: SongLite;
  queue?: SongLite[];
  showDownload?: boolean;
  showFavorite?: boolean;
  trailing?: React.ReactNode;
}) {
  const router = useRouter();
  const { play, current } = usePlayer();
  const lib = useLibrary();
  const isDl = lib.downloaded.has(song.songId);
  const progress = lib.downloading.get(song.songId);
  const isFav = lib.isFavSong(song.songId);
  const playing = current?.songId === song.songId;

  async function onDownload() {
    if (isDl) {
      if (confirm(`Supprimer « ${song.title} » de tes téléchargements ?`)) await lib.removeDownload(song.songId);
      return;
    }
    try {
      await lib.download(song);
    } catch (e) {
      if (e instanceof LoginRequiredError) router.push("/connexion");
      else if (e instanceof WifiOnlyError) alert("Téléchargement en Wi-Fi seulement : connecte-toi à un Wi-Fi ou change le réglage dans « Hors ligne ».");
      else alert("Le téléchargement a échoué. Réessaie.");
    }
  }

  return (
    <div className={`card flex h-14 items-center gap-3 py-2.5 pr-2 pl-2.5 md:h-16 ${playing ? "ring-2 ring-pink" : ""}`}>
      <button onClick={() => play(song, { queue })} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Chanter ${song.title}`}>
        <LetterTile text={song.title} size={40} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] leading-tight font-extrabold md:text-[18px]">{song.title}</span>
          <span className="block truncate text-sm text-muted">{song.artist}</span>
        </span>
      </button>
      <Link href={song.url} className="hidden size-10 place-items-center rounded-full text-muted hover:bg-sand 2xl:grid" aria-label={`Paroles de ${song.title}`} title="Voir les paroles">
        <Icon name="lyrics" size={22} />
      </Link>
      {showDownload && (
        <button onClick={onDownload} disabled={!!progress} className="grid size-10 place-items-center rounded-full hover:bg-sand" aria-label={isDl ? "Téléchargé" : "Télécharger"} title={isDl ? "Disponible hors ligne" : "Télécharger"}>
          {progress ? (
            <span className="size-5 animate-spin rounded-full border-2 border-teal/30 border-t-teal" />
          ) : (
            <Icon name={isDl ? "download_done" : "download"} size={24} className={isDl ? "text-teal" : "text-ink"} />
          )}
        </button>
      )}
      {showFavorite && (
        <button onClick={() => lib.toggleFavSong(song)} className="grid size-10 place-items-center rounded-full hover:bg-sand" aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}>
          <Icon name="favorite" filled={isFav} size={24} className="text-pink" />
        </button>
      )}
      {trailing}
    </div>
  );
}

/** Grille de lignes : 1 colonne mobile, 2 tablette, 3 grand écran. */
export function SongGrid({ songs, empty = "Aucun titre." }: { songs: SongLite[]; empty?: string }) {
  if (!songs.length) return <p className="text-muted">{empty}</p>;
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,360px),1fr))] gap-2.5 md:gap-3">
      {songs.map((s) => (
        <li key={s.songId}>
          <SongRow song={s} queue={songs} />
        </li>
      ))}
    </ul>
  );
}
