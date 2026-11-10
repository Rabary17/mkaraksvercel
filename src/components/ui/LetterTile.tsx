const TILE_COLORS = ["bg-yellow", "bg-pink-soft", "bg-mint", "bg-lilac", "bg-peach"];

export function tileColor(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TILE_COLORS[h % TILE_COLORS.length];
}

/** Vignette carrée avec l'initiale du titre (maquette : A jaune, M rose, Z menthe…). */
export function LetterTile({ text, size = 44, className = "" }: { text: string; size?: number; className?: string }) {
  const letter = (text.trim().match(/[\p{L}\p{N}]/u)?.[0] ?? "?").toUpperCase();
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-[14px] font-display font-extrabold text-ink ${tileColor(text)} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {letter}
    </span>
  );
}
