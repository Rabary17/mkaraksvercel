"use client";
import type { SongLite } from "@/lib/client/db";
import { usePlayer } from "@/components/player/PlayerProvider";
import { Icon } from "@/components/ui/Icon";

export function PlayAllButton({ songs, label = "Tout chanter" }: { songs: SongLite[]; label?: string }) {
  const { play, setExpanded } = usePlayer();
  return (
    <button
      onClick={() => {
        void play(songs[0], { queue: songs });
        setExpanded(true);
      }}
      className="btn-primary h-12 px-6 text-base"
    >
      <Icon name="play_arrow" filled size={24} /> {label}
    </button>
  );
}
