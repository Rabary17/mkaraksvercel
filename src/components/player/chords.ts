import type { ChordSegment, LyricLine } from "@/lib/types";

const NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const SHARP_TO_FLAT: Record<string, string> = { "C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab", "A#": "Bb" };
const FRENCH: Record<string, string> = {
  C: "Do", Db: "Do#", D: "Ré", Eb: "Mi♭", E: "Mi", F: "Fa", Gb: "Fa#", G: "Sol", Ab: "La♭", A: "La", Bb: "Si♭", B: "Si",
};

/** "D:maj" + 2 demi-tons → "Mi" ; "A:min" → "La m". Même logique que l'ancien player80.js. */
export function transposeChord(chord: string | undefined, semitones: number): string {
  if (!chord || chord === "N") return "—";
  const m = chord.match(/^([A-G][#b]?)(?::(maj|min))?$/i);
  if (!m) return chord;
  const root = SHARP_TO_FLAT[m[1]] ?? m[1];
  const idx = NOTES.indexOf(root);
  if (idx < 0) return chord;
  const note = NOTES[(idx + semitones + 120) % 12];
  return FRENCH[note] + (m[2]?.toLowerCase() === "min" ? " m" : "");
}

/** Convertit "D Major" (tonalité WordPress) en code accord "D:maj". */
export function keyToChord(key: string | null) {
  const m = key?.match(/^([A-G][#b]?)\s*(major|minor)?/i);
  return m ? `${m[1]}:${m[2]?.toLowerCase() === "minor" ? "min" : "maj"}` : undefined;
}

/**
 * Place chaque changement d'accord au-dessus du mot qui commence à ce moment-là
 * (comme la maquette : « La » au-dessus de « andro », « Ré » au-dessus de « lava »).
 * Retourne, pour chaque ligne, un tableau d'accords indexé par mot.
 */
export function chordsOverWords(lines: LyricLine[], chords: ChordSegment[]): (string | undefined)[][] {
  let last: string | undefined;
  let ci = 0;
  return lines.map((line) =>
    line.words.map((w, wi) => {
      const until = line.words[wi + 1]?.start ?? line.end;
      let found: string | undefined;
      while (ci < chords.length && chords[ci].start < until) {
        if (chords[ci].end > w.start - 0.25 && chords[ci].chord_majmin !== "N") found = chords[ci].chord_majmin;
        ci++;
      }
      if (found && found !== last) {
        last = found;
        return found;
      }
      return undefined;
    }),
  );
}

export function formatTime(t: number) {
  if (!Number.isFinite(t) || t < 0) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
