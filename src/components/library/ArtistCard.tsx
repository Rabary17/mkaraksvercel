"use client";
import Link from "next/link";
import { tileColor } from "@/components/ui/LetterTile";
import { Icon } from "@/components/ui/Icon";
import { useLibrary } from "@/components/providers/LibraryProvider";

/** Carte artiste colorée (écran 06, « Artistes favoris »). */
export function ArtistCard({ slug, name, count }: { slug: string; name: string; count?: number }) {
  const letter = (name.trim().match(/[\p{L}\p{N}]/u)?.[0] ?? "?").toUpperCase();
  return (
    <Link href={`/artiste/${slug}`} className={`flex aspect-[1.05] flex-col justify-between rounded-[24px] p-4 transition hover:-translate-y-0.5 md:p-5 ${tileColor(name)}`}>
      <span className="grid size-12 place-items-center rounded-full bg-white font-display text-xl font-extrabold">{letter}</span>
      <span>
        <span className="line-clamp-2 font-display text-lg leading-tight font-bold md:text-xl">{name}</span>
        {count != null && <span className="text-sm font-semibold">{count} karaoké{count > 1 ? "s" : ""}</span>}
      </span>
    </Link>
  );
}

export function ArtistFavButton({ slug, name, count }: { slug: string; name: string; count?: number }) {
  const lib = useLibrary();
  const fav = lib.isFavArtist(slug);
  return (
    <button onClick={() => lib.toggleFavArtist({ slug, name, count })} className={fav ? "btn-primary h-12 px-5 text-base" : "btn-outline h-12 px-5 text-base"} aria-pressed={fav}>
      <Icon name="favorite" filled={fav} size={22} /> {fav ? "Artiste favori" : "Ajouter aux favoris"}
    </button>
  );
}
