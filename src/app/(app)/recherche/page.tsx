import Link from "next/link";
import { getLatestSongs, toLite } from "@/lib/wp";
import { SearchBox } from "@/components/home/SearchBox";
import { SongGrid } from "@/components/library/SongRow";
import { Pager } from "@/components/ui/Pager";
import { Icon } from "@/components/ui/Icon";

export const metadata = { title: "Chercher" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { q = "", page } = await searchParams;
  const current = Math.max(1, Number(page) || 1);
  const query = q.trim();
  const result = query ? await getLatestSongs(current, query) : null;

  return (
    <div className="space-y-6 md:space-y-8">
      <h1 className="h-display text-[32px] md:text-5xl">Chercher</h1>
      <div className="max-w-2xl">
        <SearchBox defaultValue={query} autoFocus={!query} />
      </div>

      {!result ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/artistes" className="flex items-center gap-4 rounded-[24px] bg-lilac p-5 font-display text-lg font-bold">
            <Icon name="mic_external_on" size={32} /> Parcourir les artistes
          </Link>
          <Link href="/" className="flex items-center gap-4 rounded-[24px] bg-mint p-5 font-display text-lg font-bold">
            <Icon name="library_music" size={32} /> Tous les karaokés
          </Link>
          <Link href="/favoris" className="flex items-center gap-4 rounded-[24px] bg-pink-soft p-5 font-display text-lg font-bold">
            <Icon name="favorite" filled size={32} /> Mes favoris
          </Link>
        </div>
      ) : (
        <section className="space-y-4">
          <p className="text-muted">
            {result.total.toLocaleString("fr-FR")} résultat{result.total > 1 ? "s" : ""} pour « {query} »
          </p>
          <SongGrid songs={result.songs.map(toLite)} empty="Aucun titre trouvé. Essaie avec le nom de l’artiste." />
          <Pager current={current} pages={Math.ceil(result.total / 24)} href={(p) => `/recherche?${new URLSearchParams({ q: query, page: String(p) })}`} />
        </section>
      )}
    </div>
  );
}
