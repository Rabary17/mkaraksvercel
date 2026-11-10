import type { PlaylistColor } from "@/lib/client/db";

/** Couleurs des cartes playlist de la maquette (écran 07). Classes écrites en entier pour Tailwind. */
export const PLAYLIST_BG: Record<PlaylistColor, string> = {
  yellow: "bg-yellow text-ink",
  pink: "bg-pink text-white",
  teal: "bg-teal text-ink",
  violet: "bg-lilac text-ink",
  orange: "bg-orange text-ink",
};

export const PLAYLIST_SWATCH: Record<PlaylistColor, string> = {
  yellow: "bg-yellow",
  pink: "bg-pink",
  teal: "bg-teal",
  violet: "bg-violet",
  orange: "bg-orange",
};
