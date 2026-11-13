"use client";
import { useEffect, useState } from "react";
import { useUser } from "@/components/providers/UserProvider";
import { usePlayer } from "@/components/player/PlayerProvider";
import { getResume, type ResumeState } from "@/lib/client/prefs";
import { formatTime } from "@/components/player/chords";
import { Icon } from "@/components/ui/Icon";
import { AccountButton } from "@/components/layout/AppNav";

/** Haut de l'accueil (écran 03) : salutation, recherche, carte « Reprendre ». */
export function HomeHero() {
  const { user } = useUser();
  const { play } = usePlayer();
  const [resume, setResumeState] = useState<ResumeState | null>(null);
  useEffect(() => setResumeState(getResume()), []);

  const first = user?.name.split(" ")[0];

  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_minmax(0,440px)] lg:items-end lg:gap-10">
      <div className="space-y-5">
        <div className="flex items-center justify-between md:hidden">
          <span className="font-display text-2xl font-extrabold">Mkaraks</span>
          <div className="w-11">
            <AccountButton compact />
          </div>
        </div>
        <h1 className="h-display text-[32px] md:text-5xl lg:text-[56px]">
          {first ? (
            <>
              Salut {first} ! <br className="hidden md:block" />
              On chante quoi ?
            </>
          ) : (
            <>
              Karaoké 100% malagasy. <br className="hidden md:block" />
              On chante quoi ?
            </>
          )}
        </h1>
      </div>

      {resume && (
        <button
          onClick={() => play(resume.item, { startAt: resume.time })}
          className="relative flex items-center gap-4 overflow-hidden rounded-[24px] bg-pink p-5 text-left text-white shadow-[0_6px_0_0_var(--color-pink-deep)] md:p-6"
        >
          <div aria-hidden className="absolute -right-10 -bottom-16 size-44 rounded-full bg-white/12 bg-white/10" />
          <span className="relative min-w-0 flex-1">
            <span className="block text-xs font-extrabold tracking-widest opacity-90">REPRENDRE</span>
            <span className="block truncate font-display text-xl font-extrabold md:text-2xl">{resume.item.title}</span>
            <span className="block truncate text-sm opacity-90">
              {resume.item.artist} · {formatTime(resume.time)} / {formatTime(resume.duration)}
            </span>
          </span>
          <span className="relative grid size-14 shrink-0 place-items-center rounded-full bg-yellow text-ink">
            <Icon name="play_arrow" filled size={34} />
          </span>
        </button>
      )}
    </section>
  );
}
