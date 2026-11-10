"use client";
import { Icon } from "@/components/ui/Icon";
import { usePlayer } from "./PlayerProvider";
import { keyToChord, transposeChord } from "./chords";

/** Contenu de l'écran 05 « Changer la tonalité » (feuille sur mobile, panneau latéral sur desktop). */
export function PitchControl({ onDone }: { onDone?: () => void }) {
  const { pitch, setPitch, chords, keyName } = usePlayer();

  // Deux accords d'exemple : la tonalité du titre et le premier accord différent.
  const base = keyToChord(keyName) ?? chords.find((c) => c.chord_majmin !== "N")?.chord_majmin;
  const second = chords.find((c) => c.chord_majmin !== "N" && c.chord_majmin !== base)?.chord_majmin;
  const examples = [base, second].filter(Boolean) as string[];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => setPitch(pitch - 1)} className="icon-btn size-16" aria-label="Baisser d'un demi-ton">
          <Icon name="remove" size={32} />
        </button>
        <div className="text-center">
          <p className="font-display text-6xl font-extrabold text-pink tabular-nums">{pitch > 0 ? `+${pitch}` : pitch}</p>
          <p className="text-muted">demi-tons</p>
        </div>
        <button
          onClick={() => setPitch(pitch + 1)}
          className="grid size-16 place-items-center rounded-full bg-pink text-white shadow-[0_5px_0_0_var(--color-pink-deep)]"
          aria-label="Monter d'un demi-ton"
        >
          <Icon name="add" size={32} />
        </button>
      </div>

      {/* Points -6 … +6 */}
      <div className="flex items-center justify-between px-1" aria-hidden>
        {Array.from({ length: 13 }, (_, i) => i - 6).map((v) => (
          <button
            key={v}
            onClick={() => setPitch(v)}
            tabIndex={-1}
            className={`rounded-full transition-all ${v === pitch ? "size-4 bg-pink ring-4 ring-pink/25" : v === 0 ? "size-2.5 bg-ink" : "size-2 bg-line"}`}
          />
        ))}
      </div>

      {examples.length > 0 && (
        <div className="card p-4">
          <p className="mb-2 text-sm text-muted">Les accords suivent</p>
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-lg font-extrabold">
            {examples.map((c) => (
              <span key={c} className="inline-flex items-center gap-2">
                {transposeChord(c, 0)}
                <Icon name="arrow_forward" size={20} className="text-pink" />
                <span className="text-pink">{transposeChord(c, pitch)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {onDone && (
        <button onClick={onDone} className="btn-ink w-full">
          Valider
        </button>
      )}
    </div>
  );
}
