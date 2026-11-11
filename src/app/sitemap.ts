import type { MetadataRoute } from "next";
import { getAllArtistPaths, getAllSongPaths } from "@/lib/wp";
import { absolute } from "@/lib/seo";

/**
 * ~16 900 URLs (14 517 chansons + 2 397 artistes), sous la limite de 50 000 par
 * fichier : un seul sitemap suffit, pas besoin d'index.
 *
 * Reconstruit une fois par jour. Les modifications ponctuelles n'ont pas besoin
 * d'attendre : le webhook /api/revalidate purge les tags « songs » et « artists »,
 * dont dépendent les requêtes ci-dessous.
 */
export const revalidate = 86400;
export const maxDuration = 60;

const PAGES_FIXES: { path: string; priority: number }[] = [
  { path: "/", priority: 1 },
  { path: "/artistes", priority: 0.8 },
  { path: "/recherche", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base: MetadataRoute.Sitemap = PAGES_FIXES.map((p) => ({
    url: absolute(p.path),
    changeFrequency: "daily",
    priority: p.priority,
  }));

  // WordPress indisponible : mieux vaut un sitemap réduit qu'une erreur 500, qui
  // ferait abandonner le fichier à Google pour plusieurs jours.
  const [songs, artists] = await Promise.all([
    getAllSongPaths().catch(() => []),
    getAllArtistPaths().catch(() => []),
  ]);

  return [
    ...base,
    ...artists.map((a) => ({
      url: absolute(a.path),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    // Une centaine de titres sont jouables, les autres sont des pages de paroles.
    // Les annoncer à égalité laisserait Google répartir son budget de crawl au
    // hasard sur 14 500 URLs, dont les plus utiles ne sont pas les plus nombreuses.
    ...songs.map((s) => ({
      url: absolute(s.path),
      lastModified: s.lastModified,
      changeFrequency: "monthly" as const,
      priority: s.jouable ? 0.8 : 0.5,
    })),
  ];
}
