import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getArtist, getArtistSongs, toLite } from "@/lib/wp";
import { SongGrid } from "@/components/library/SongRow";
import { ArtistFavButton } from "@/components/library/ArtistCard";
import { PlayAllButton } from "@/components/library/PlayAllButton";
import { tileColor } from "@/components/ui/LetterTile";
import { JsonLd } from "@/components/seo/JsonLd";
import { artistJsonLd } from "@/lib/seo";

export const revalidate = 3600;
export const dynamicParams = true;
export function generateStaticParams() {
  return []; // pages générées à la première visite puis mises en cache (ISR)
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const artist = await getArtist((await params).slug);
  return artist
    ? {
        title: `${artist.name} – Karaoké`,
        description: `Tous les karaokés de ${artist.name} sur Mkaraks.`,
        alternates: { canonical: `/artiste/${artist.slug}` },
      }
    : {};
}

export default async function ArtistPage({ params }: Params) {
  const artist = await getArtist((await params).slug);
  if (!artist) notFound();
  const songs = (await getArtistSongs(artist.id)).map(toLite);
  const letter = (artist.name.match(/[\p{L}\p{N}]/u)?.[0] ?? "?").toUpperCase();

  return (
    <div className="space-y-8">
      <JsonLd data={artistJsonLd(artist, songs)} />
      <header className={`relative overflow-hidden rounded-[28px] p-6 md:flex md:items-end md:gap-8 md:p-10 ${tileColor(artist.name)}`}>
        <div aria-hidden className="absolute -top-16 -right-16 size-56 rounded-full bg-white/25 md:size-80" />
        <span className="relative grid size-20 place-items-center rounded-full bg-white font-display text-4xl font-extrabold md:size-32 md:text-6xl">{letter}</span>
        <div className="relative mt-4 space-y-3 md:mt-0">
          <p className="text-sm font-extrabold tracking-widest">ARTISTE</p>
          <h1 className="h-display text-4xl md:text-6xl">{artist.name}</h1>
          <p className="font-semibold">{songs.length} karaoké{songs.length > 1 ? "s" : ""}</p>
          <div className="flex flex-wrap gap-3 pt-1">
            {songs.length > 0 && <PlayAllButton songs={songs} />}
            <ArtistFavButton slug={artist.slug} name={artist.name} count={songs.length} />
          </div>
        </div>
      </header>
      <SongGrid songs={songs} />
    </div>
  );
}
