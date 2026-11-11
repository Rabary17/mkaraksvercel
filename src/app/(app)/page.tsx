import { getLatestSongs, toLite } from "@/lib/wp";
import { HomeHero } from "@/components/home/HomeHero";
import { SongGrid } from "@/components/library/SongRow";
import { Pager } from "@/components/ui/Pager";
import { JsonLd } from "@/components/seo/JsonLd";
import { siteJsonLd } from "@/lib/seo";

export const revalidate = 3600;

export default async function Home({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const current = Math.max(1, Number((await searchParams).page) || 1);
  const { songs, total } = await getLatestSongs(current);

  return (
    <div className="space-y-8 md:space-y-12">
      <JsonLd data={siteJsonLd()} />
      <HomeHero />
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="h-section md:text-2xl">Tous les karaokés</h2>
          <span className="text-sm text-muted">{total.toLocaleString("fr-FR")} titres</span>
        </div>
        <SongGrid songs={songs.map(toLite)} />
        <Pager current={current} pages={Math.ceil(total / 24)} href={(p) => `/?page=${p}`} />
      </section>
    </div>
  );
}
