import Link from "next/link";
import { getCatalogueCounts, getLatestSongs, toLite } from "@/lib/wp";
import { HomeHero } from "@/components/home/HomeHero";
import { SongGrid } from "@/components/library/SongRow";
import { Pager } from "@/components/ui/Pager";
import { JsonLd } from "@/components/seo/JsonLd";
import { siteJsonLd } from "@/lib/seo";

export const revalidate = 3600;

/**
 * L'accueil ne montre que les titres réellement chantables.
 *
 * Le catalogue compte 14 517 fiches pour une centaine de fichiers audio. En
 * listant tout, un visiteur tombait sur une page non chantable 99 fois sur 100
 * et en concluait que le site ne marche pas — pas que le catalogue démarre.
 * Les pages de paroles gardent toute leur valeur, par la recherche et par le
 * référencement ; elles n'ont simplement rien à faire en vitrine.
 */
export default async function Home({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const current = Math.max(1, Number((await searchParams).page) || 1);
  const [{ songs, total }, volumes] = await Promise.all([
    getLatestSongs(current, undefined, true),
    getCatalogueCounts(),
  ]);
  const paroles = Math.max(0, volumes.total - volumes.jouables);

  return (
    <div className="space-y-8 md:space-y-12">
      <JsonLd data={siteJsonLd()} />
      <HomeHero />

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="h-section md:text-2xl">Chante maintenant</h2>
          <span className="text-sm text-muted">
            {total.toLocaleString("fr-FR")} karaoké{total > 1 ? "s" : ""}
          </span>
        </div>
        <SongGrid songs={songs.map(toLite)} />
        <Pager current={current} pages={Math.ceil(total / 24)} href={(p) => `/?page=${p}`} />
      </section>

      {/* Nul si le plugin ne gère pas encore le filtre : les deux totaux sont
          alors égaux et le bloc disparaît de lui-même. */}
      {paroles > 0 && (
        <section className="card space-y-4 text-center">
          <h2 className="h-section">Et {paroles.toLocaleString("fr-FR")} titres en paroles</h2>
          <p className="text-muted">
            Le reste du catalogue est disponible en paroles, sans accompagnement pour l’instant.
          </p>
          <Link href="/recherche" className="btn-outline inline-flex h-12 px-6">
            Chercher un titre
          </Link>
        </section>
      )}
    </div>
  );
}
