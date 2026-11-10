"use client";
import Link from "next/link";
import { use } from "react";
import { useRouter } from "next/navigation";
import { useLibrary } from "@/components/providers/LibraryProvider";
import { SongRow } from "@/components/library/SongRow";
import { PlayAllButton } from "@/components/library/PlayAllButton";
import { PLAYLIST_BG } from "@/components/library/playlist-colors";
import { Icon } from "@/components/ui/Icon";

export default function PlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const lib = useLibrary();
  const router = useRouter();
  const pl = lib.playlists.find((p) => p.id === id);

  if (!lib.ready) return null;
  if (!pl)
    return (
      <div className="space-y-4">
        <p className="text-muted">Playlist introuvable sur cet appareil.</p>
        <Link href="/playlists" className="font-bold text-pink">
          Retour aux playlists
        </Link>
      </div>
    );

  const missing = pl.songs.filter((s) => !lib.downloaded.has(s.songId));

  return (
    <div className="space-y-8">
      <Link href="/playlists" className="icon-btn" aria-label="Retour aux playlists">
        <Icon name="arrow_back" />
      </Link>
      <header className={`relative overflow-hidden rounded-[28px] p-6 md:p-10 ${PLAYLIST_BG[pl.color]}`}>
        <div aria-hidden className="absolute -top-16 -right-16 size-56 rounded-full bg-white/20 md:size-80" />
        <div className="relative space-y-3">
          <Icon name="queue_music" size={40} />
          <h1 className="h-display text-4xl md:text-6xl">{pl.name}</h1>
          <p className="font-semibold">
            {pl.songs.length} titres{pl.offline && " · hors ligne"}
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            {pl.songs.length > 0 && <PlayAllButton songs={pl.songs} />}
            {missing.length > 0 && (
              <button onClick={() => missing.forEach((s) => void lib.download(s).catch(() => {}))} className="btn-outline h-12 border-current px-5 text-base">
                <Icon name="download" /> Télécharger ({missing.length})
              </button>
            )}
            <button
              onClick={async () => {
                if (!confirm(`Supprimer la playlist « ${pl.name} » ?`)) return;
                await lib.deletePlaylist(pl.id);
                router.push("/playlists");
              }}
              className="grid size-12 place-items-center rounded-full border-[1.6px] border-current"
              aria-label="Supprimer la playlist"
            >
              <Icon name="delete" />
            </button>
          </div>
        </div>
      </header>

      {pl.songs.length === 0 ? (
        <div className="card p-8 text-center text-muted">
          Ajoute des titres depuis leur page avec le bouton <Icon name="playlist_add" size={20} className="align-middle" />.
        </div>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,360px),1fr))] gap-2.5 md:gap-3">
          {pl.songs.map((s) => (
            <li key={s.songId}>
              <SongRow
                song={s}
                queue={pl.songs}
                showFavorite={false}
                trailing={
                  <button onClick={() => lib.removeFromPlaylist(pl.id, s.songId)} className="grid size-10 place-items-center rounded-full text-muted hover:bg-sand" aria-label={`Retirer ${s.title}`}>
                    <Icon name="close" size={22} />
                  </button>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
