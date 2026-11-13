"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLibrary } from "@/components/providers/LibraryProvider";
import { NewPlaylistSheet } from "@/components/library/NewPlaylistSheet";
import { LoginNeeded } from "@/components/library/LoginNeeded";
import { PLAYLIST_BG } from "@/components/library/playlist-colors";
import { Icon } from "@/components/ui/Icon";

/** Écran 07 : grille de playlists colorées + création. */
export function PlaylistsView() {
  const lib = useLibrary();
  const router = useRouter();
  const params = useSearchParams();
  const open = params.get("nouvelle") === "1";
  const setOpen = (v: boolean) => router.replace(v ? "/playlists?nouvelle=1" : "/playlists", { scroll: false });

  if (lib.ready && !lib.loggedIn) {
    return (
      <div className="space-y-6 md:space-y-8">
        <h1 className="h-display text-[32px] md:text-5xl">Playlists</h1>
        <LoginNeeded icon="queue_music" text="Connecte-toi pour créer tes playlists sur tous tes appareils." />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="h-display text-[32px] md:text-5xl">Playlists</h1>
        <button onClick={() => setOpen(true)} className="btn-primary h-12 px-5 text-base">
          <Icon name="add" /> <span className="hidden sm:inline">Nouvelle playlist</span>
        </button>
      </div>

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
        {lib.playlists.map((pl) => (
          <li key={pl.id}>
            <Link href={`/playlists/${pl.id}`} className={`flex aspect-[1.15] flex-col justify-between rounded-[24px] p-4 transition hover:-translate-y-0.5 md:p-5 ${PLAYLIST_BG[pl.color]}`}>
              <Icon name="queue_music" size={30} />
              <span>
                <span className="line-clamp-2 font-display text-lg leading-tight font-bold md:text-xl">{pl.name}</span>
                <span className="flex items-center gap-1 text-sm font-semibold opacity-90">
                  {pl.songs.length} titres {pl.offline && <Icon name="download_for_offline" size={16} />}
                </span>
              </span>
            </Link>
          </li>
        ))}
        <li>
          <button onClick={() => setOpen(true)} className="flex aspect-[1.15] w-full flex-col items-center justify-center gap-2 rounded-[24px] border-2 border-dashed border-line font-bold text-muted hover:border-ink hover:text-ink">
            <Icon name="add_circle" size={36} />
            Nouvelle playlist
          </button>
        </li>
      </ul>

      <NewPlaylistSheet open={open} onClose={() => setOpen(false)} onCreated={(p) => router.push(`/playlists/${p.id}`)} />
    </div>
  );
}
