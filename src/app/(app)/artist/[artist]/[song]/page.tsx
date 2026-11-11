import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { getSong, songUrl, toLite } from "@/lib/wp";
import { SongPageActions } from "@/components/library/SongPageActions";
import { LetterTile } from "@/components/ui/LetterTile";
import { Icon } from "@/components/ui/Icon";
import { JsonLd } from "@/components/seo/JsonLd";
import { songJsonLd } from "@/lib/seo";

export const revalidate = 3600;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

// Même URL que le site actuel (/artist/{artiste}/{chanson}/) pour conserver le SEO.
type Params = { params: Promise<{ artist: string; song: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const song = await getSong((await params).song);
  if (!song) return {};
  const artist = song.media.artist?.name ?? "";
  return {
    title: `${song.title} – ${artist} (karaoké)`,
    description: `Chante « ${song.title} » de ${artist} en karaoké, avec paroles synchronisées et accords.`,
    alternates: { canonical: songUrl(song) },
  };
}

export default async function SongPage({ params }: Params) {
  const { artist, song: slug } = await params;
  const song = await getSong(slug);
  if (!song) notFound();
  if (song.media.artist && song.media.artist.slug !== artist) permanentRedirect(songUrl(song));

  const lite = toLite(song);

  return (
    <article className="grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-12">
      <JsonLd data={songJsonLd(song)} />
      {/* Colonne fiche (fixe sur desktop) */}
      <div className="space-y-6 lg:sticky lg:top-10 lg:self-start">
        <Link href={song.media.artist ? `/artiste/${song.media.artist.slug}` : "/"} className="icon-btn" aria-label="Retour">
          <Icon name="arrow_back" />
        </Link>
        <div className="flex items-center gap-5 lg:flex-col lg:items-start">
          <LetterTile text={song.title} size={96} className="rounded-[28px] lg:!size-40 lg:text-[80px]" />
          <div className="min-w-0 space-y-2">
            {song.media.artist && (
              <Link href={`/artiste/${song.media.artist.slug}`} className="text-sm font-extrabold tracking-widest text-pink uppercase">
                {song.media.artist.name}
              </Link>
            )}
            <h1 className="h-display text-[32px] md:text-5xl">{song.title}</h1>
            {song.media.key && (
              <p className="inline-flex items-center gap-1.5 rounded-full bg-sand px-3 py-1 text-sm font-bold">
                <Icon name="piano" size={18} /> Tonalité : {song.media.key}
              </p>
            )}
          </div>
        </div>
        <SongPageActions song={lite} />
      </div>

      {/* Paroles en texte : indexées par Google, contenu venant de l'éditeur WordPress */}
      {song.lyricsHtml && (
        <section className="card p-6 md:p-10">
          <h2 className="h-section mb-5">Paroles</h2>
          <div
            className="space-y-5 text-lg leading-relaxed font-medium md:text-xl [&_p]:mb-5"
            dangerouslySetInnerHTML={{ __html: song.lyricsHtml }}
          />
        </section>
      )}
    </article>
  );
}
