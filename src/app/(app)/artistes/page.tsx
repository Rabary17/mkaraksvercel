import { getArtists } from "@/lib/wp";
import { ArtistCard } from "@/components/library/ArtistCard";
import { Pager } from "@/components/ui/Pager";

export const revalidate = 3600;
export const metadata = { title: "Artistes" };

export default async function ArtistsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const current = Math.max(1, Number((await searchParams).page) || 1);
  const { artists, total } = await getArtists(current);

  return (
    <div className="space-y-6 md:space-y-8">
      <h1 className="h-display text-[32px] md:text-5xl">Artistes</h1>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
        {artists.map((a) => (
          <li key={a.id}>
            <ArtistCard slug={a.slug} name={a.name} count={a.count} />
          </li>
        ))}
      </ul>
      <Pager current={current} pages={Math.ceil(total / 60)} href={(p) => `/artistes?page=${p}`} />
    </div>
  );
}
