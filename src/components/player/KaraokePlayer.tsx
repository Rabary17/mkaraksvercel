"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePlayer } from "./PlayerProvider";
import { chordsOverWords, formatTime } from "./chords";
import { PitchControl } from "./PitchControl";
import { Icon } from "@/components/ui/Icon";
import { LetterTile } from "@/components/ui/LetterTile";
import { Sheet } from "@/components/ui/Sheet";
import { useLibrary } from "@/components/providers/LibraryProvider";
import { getPrefs, setPrefs } from "@/lib/client/prefs";
import { transposeChord } from "./chords";

const LEAD = 0.3; // même avance que l'ancien lecteur pour le surlignage

/** Lecteur : mini-barre en bas + plein écran (écrans 04 et 05 de la maquette). */
export function KaraokePlayer() {
  const p = usePlayer();
  if (!p.current) return null;
  return (
    <>
      <MiniPlayer />
      {p.expanded && <FullPlayer />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Mini-lecteur : au-dessus de la barre d'onglets (mobile),            */
/* barre pleine largeur à côté du rail / de la barre latérale (md/lg)  */
/* ------------------------------------------------------------------ */
function MiniPlayer() {
  const p = usePlayer();
  const c = p.current!;
  const pct = p.duration ? (p.time / p.duration) * 100 : 0;
  const busy = p.status === "loading";

  return (
    <div className="fixed inset-x-2 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 md:inset-x-0 md:bottom-0 md:left-[96px] lg:left-[272px]">
      <div className="relative overflow-hidden rounded-[22px] bg-ink text-white shadow-xl md:rounded-none md:shadow-none">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-white/10">
          <div className="h-full bg-pink" style={{ width: `${pct}%` }} />
        </div>
        <div className="mx-auto flex h-[68px] max-w-[1400px] items-center gap-3 px-3 md:h-20 md:px-6">
          <button onClick={() => p.setExpanded(true)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label="Ouvrir le lecteur">
            <LetterTile text={c.title} size={44} />
            <span className="min-w-0">
              <span className="block truncate font-extrabold">{c.title}</span>
              <span className="block truncate text-sm text-white/60">
                {p.status === "login" ? "Connecte-toi pour chanter" : p.error ?? c.artist}
              </span>
            </span>
          </button>

          <span className="hidden text-sm tabular-nums text-white/60 md:block">
            {formatTime(p.time)} / {formatTime(p.duration)}
          </span>
          <button onClick={p.prev} disabled={p.index <= 0} className="hidden size-10 place-items-center disabled:opacity-30 md:grid" aria-label="Précédent">
            <Icon name="skip_previous" filled size={28} />
          </button>
          <button
            onClick={p.toggle}
            disabled={busy || p.status === "error" || p.status === "login"}
            className="grid size-12 shrink-0 place-items-center rounded-full bg-pink disabled:opacity-50"
            aria-label={p.status === "playing" ? "Pause" : "Lecture"}
          >
            {busy ? (
              <span className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Icon name={p.status === "playing" ? "pause" : "play_arrow"} filled size={28} />
            )}
          </button>
          <button onClick={p.next} disabled={p.index >= p.queue.length - 1} className="hidden size-10 place-items-center disabled:opacity-30 md:grid" aria-label="Suivant">
            <Icon name="skip_next" filled size={28} />
          </button>
          <button onClick={() => p.setExpanded(true)} className="hidden size-10 place-items-center md:grid" aria-label="Plein écran">
            <Icon name="open_in_full" size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Plein écran                                                         */
/* ------------------------------------------------------------------ */
function FullPlayer() {
  const p = usePlayer();
  const lib = useLibrary();
  const c = p.current!;
  const [showChords, setShowChords] = useState(true);
  const [pitchOpen, setPitchOpen] = useState(false);
  const lyricsRef = useRef<HTMLDivElement>(null);

  useEffect(() => setShowChords(getPrefs().showChords), []);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") p.setExpanded(false);
      if (e.key === " " && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        p.toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [p]);

  const t = p.time + LEAD;
  const lineIdx = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < p.lyrics.length; i++) if (p.lyrics[i].start <= t) idx = i;
    return idx;
  }, [p.lyrics, t]);
  const wordChords = useMemo(() => chordsOverWords(p.lyrics, p.chords), [p.lyrics, p.chords]);

  useEffect(() => {
    const el = lyricsRef.current?.querySelector<HTMLElement>(`[data-line="${Math.max(0, lineIdx)}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [lineIdx]);

  const pct = p.duration ? (p.time / p.duration) * 100 : 0;
  const isFav = lib.isFavSong(c.songId);
  const isDl = lib.downloaded.has(c.songId);
  const song = { songId: c.songId, title: c.title, artist: c.artist, artistSlug: c.artistSlug, url: c.url ?? "/" };

  function toggleChords() {
    setShowChords((v) => {
      setPrefs({ showChords: !v });
      return !v;
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-ink text-white" role="dialog" aria-label={`Lecteur : ${c.title}`}>
      {/* Formes décoratives */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 -right-24 size-80 rounded-full bg-violet/45 blur-[2px] md:size-[520px]" />
        <div className="absolute bottom-24 -left-28 size-72 rounded-full bg-pink/25 md:size-[460px]" />
      </div>

      {/* En-tête */}
      <header className="relative flex items-center gap-3 px-4 pt-[calc(14px+env(safe-area-inset-top))] md:px-8 md:pt-6">
        <button onClick={() => p.setExpanded(false)} className="grid size-11 place-items-center rounded-full hover:bg-white/10" aria-label="Réduire le lecteur">
          <Icon name="keyboard_arrow_down" size={32} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate font-display text-lg font-bold text-yellow md:text-2xl">{c.title}</p>
          {c.artistSlug ? (
            <Link href={`/artiste/${c.artistSlug}`} onClick={() => p.setExpanded(false)} className="text-sm text-white/70 hover:underline">
              {c.artist}
            </Link>
          ) : (
            <p className="text-sm text-white/70">{c.artist}</p>
          )}
        </div>
        <button
          onClick={() => (isDl ? lib.removeDownload(c.songId) : lib.download(song).catch(() => {}))}
          className="grid size-11 place-items-center rounded-full hover:bg-white/10"
          aria-label={isDl ? "Téléchargé (supprimer)" : "Télécharger"}
          title={isDl ? "Disponible hors ligne" : "Télécharger"}
        >
          <Icon name={isDl ? "download_done" : lib.downloading.has(c.songId) ? "downloading" : "download"} size={26} className={isDl ? "text-teal" : ""} />
        </button>
      </header>

      {/* Puces d'options */}
      <div className="relative mt-3 flex justify-center gap-2 px-4 lg:hidden">
        <button onClick={() => setPitchOpen(true)} className="chip bg-white/12 bg-white/10">
          <Icon name="tune" size={20} /> Ton {p.pitch > 0 ? `+${p.pitch}` : p.pitch}
        </button>
        <button onClick={toggleChords} className={`chip ${showChords ? "bg-yellow text-ink" : "bg-white/10"}`} aria-pressed={showChords}>
          <Icon name="piano" size={20} /> Accords
        </button>
        <span className="chip border border-dashed border-white/35 text-white/60">
          <Icon name="music_note" size={20} /> Guitare · bientôt
        </span>
      </div>

      {/* Corps : paroles (+ panneau latéral sur desktop) */}
      <div className="relative flex min-h-0 flex-1">
        <div
          ref={lyricsRef}
          className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-[35dvh] text-center [mask-image:linear-gradient(transparent,black_18%,black_82%,transparent)] md:px-12"
        >
          {p.status === "loading" && <p className="text-white/60">Chargement…</p>}
          {p.status === "login" && (
            <div className="space-y-4">
              <p className="text-xl font-bold">Connecte-toi pour chanter ce titre.</p>
              <Link href="/connexion" onClick={() => p.setExpanded(false)} className="btn-primary">
                Se connecter
              </Link>
            </div>
          )}
          {p.status === "error" && <p className="text-lg text-pink-soft">{p.error}</p>}

          <div className="mx-auto max-w-3xl space-y-6 md:space-y-8">
            {p.lyrics.map((line, i) => {
              const active = i === lineIdx;
              const past = i < lineIdx;
              const lineProgress = active ? Math.min(1, Math.max(0, (t - line.start) / (line.end - line.start || 1))) : 0;
              return (
                <div key={i} data-line={i} className="transition-all duration-300">
                  <p
                    className={`font-extrabold transition-all duration-300 ${
                      active
                        ? "text-[34px] leading-[1.15] text-white md:text-5xl lg:text-6xl"
                        : `text-[22px] leading-snug md:text-3xl ${past ? "text-white/30" : "text-white/55"}`
                    }`}
                  >
                    {line.words.map((w, j) => {
                      const chord = showChords ? wordChords[i]?.[j] : undefined;
                      return (
                        <span key={j} className={`relative inline-block ${chord ? "pt-[1.1em]" : ""}`}>
                          {chord && (
                            <span className="absolute top-0 left-0 text-[20px] font-extrabold text-yellow md:text-2xl">
                              {transposeChord(chord, p.pitch)}
                            </span>
                          )}
                          <span className={active && t >= w.start ? "text-pink" : undefined}>{w.word}</span>&nbsp;
                        </span>
                      );
                    })}
                  </p>
                  {active && (
                    <div className="mx-auto mt-3 h-1.5 w-2/3 max-w-md overflow-hidden rounded-full bg-white/15">
                      <div className="h-full rounded-full bg-pink" style={{ width: `${lineProgress * 100}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Panneau desktop : tonalité, accords, à suivre */}
        <aside className="relative hidden w-[380px] shrink-0 flex-col gap-5 overflow-y-auto p-6 lg:flex">
          <div className="rounded-[28px] bg-cream p-6 text-ink">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-xl font-extrabold">Tonalité</h3>
              {p.pitch !== 0 && (
                <button onClick={() => p.setPitch(0)} className="text-sm font-bold text-pink">
                  Revenir à l’original
                </button>
              )}
            </div>
            <PitchControl />
          </div>

          <div className="flex gap-2">
            <button onClick={toggleChords} className={`chip ${showChords ? "bg-yellow text-ink" : "bg-white/10"}`} aria-pressed={showChords}>
              <Icon name="piano" size={20} /> Accords
            </button>
            <span className="chip border border-dashed border-white/35 text-white/60">
              <Icon name="music_note" size={20} /> Guitare · bientôt
            </span>
          </div>

          {p.queue.length > 1 && (
            <div>
              <h3 className="mb-3 font-display text-lg font-bold">À suivre</h3>
              <ul className="space-y-1">
                {p.queue.map((q, i) => (
                  <li key={q.songId}>
                    <button
                      onClick={() => p.play(q, { queue: p.queue })}
                      className={`flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-white/10 ${i === p.index ? "bg-white/10" : ""}`}
                    >
                      <LetterTile text={q.title} size={40} />
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate font-bold ${i === p.index ? "text-pink" : ""}`}>{q.title}</span>
                        <span className="block truncate text-sm text-white/55">{q.artist}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {/* Contrôles */}
      <footer className="relative mx-auto w-full max-w-3xl px-5 pb-[calc(22px+env(safe-area-inset-bottom))] md:px-8 lg:max-w-none lg:pr-[404px]">
        <div className="mx-auto max-w-3xl">
          <input
            type="range"
            min={0}
            max={1000}
            value={p.duration ? Math.round((p.time / p.duration) * 1000) : 0}
            onChange={(e) => p.seek(Number(e.target.value) / 1000)}
            className="range-yellow w-full"
            style={{ ["--p" as string]: `${pct}%` }}
            aria-label="Position dans le titre"
          />
          <div className="mt-1 flex justify-between text-sm font-semibold tabular-nums text-white/70">
            <span>{formatTime(p.time)}</span>
            <span>{formatTime(p.duration)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between md:justify-center md:gap-10">
            <button onClick={p.prev} disabled={p.index <= 0} className="grid size-12 place-items-center disabled:opacity-30" aria-label="Précédent">
              <Icon name="skip_previous" filled size={32} />
            </button>
            <button onClick={p.stop} className="grid size-12 place-items-center" aria-label="Arrêter">
              <Icon name="stop" filled size={30} />
            </button>
            <button
              onClick={p.toggle}
              disabled={p.status === "loading" || p.status === "error" || p.status === "login"}
              className="grid size-[76px] place-items-center rounded-full bg-pink shadow-[0_6px_0_0_var(--color-pink-deep)] disabled:opacity-50"
              aria-label={p.status === "playing" ? "Pause" : "Lecture"}
            >
              {p.status === "loading" ? (
                <span className="size-7 animate-spin rounded-full border-[3px] border-white/30 border-t-white" />
              ) : (
                <Icon name={p.status === "playing" ? "pause" : "play_arrow"} filled size={44} />
              )}
            </button>
            <button onClick={() => lib.toggleFavSong(song)} className="grid size-12 place-items-center" aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}>
              <Icon name="favorite" filled={isFav} size={30} className={isFav ? "text-pink" : ""} />
            </button>
            <button onClick={p.next} disabled={p.index >= p.queue.length - 1} className="grid size-12 place-items-center disabled:opacity-30" aria-label="Suivant">
              <Icon name="skip_next" filled size={32} />
            </button>
          </div>
        </div>
      </footer>

      {/* Feuille tonalité (mobile / tablette) */}
      <Sheet
        open={pitchOpen}
        onClose={() => setPitchOpen(false)}
        title="Tonalité"
        dark
        action={
          p.pitch !== 0 ? (
            <button onClick={() => p.setPitch(0)} className="text-sm font-bold text-pink">
              Revenir à l’original
            </button>
          ) : null
        }
      >
        <PitchControl onDone={() => setPitchOpen(false)} />
      </Sheet>
    </div>
  );
}
