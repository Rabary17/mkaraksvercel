import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { SITE_HOST, SITE_URL } from "@/lib/seo";

/**
 * Seul le front sur son domaine canonique est indexable.
 *
 * Servi ailleurs (mkaraksvercel.vercel.app aujourd'hui, une preview demain), le
 * fichier interdit tout. Le middleware pose en plus un X-Robots-Tag : robots.txt
 * empêche le crawl, mais seul l'en-tête fait désindexer une URL déjà connue.
 *
 * WordPress se ferme de son côté : ce fichier ne parle que du domaine du front.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const hote = (await headers()).get("host")?.toLowerCase() ?? "";

  if (hote !== SITE_HOST.toLowerCase()) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/media/", // fichiers chiffrés, illisibles par un robot
          "/connexion",
          "/inscription",
          "/favoris", // vides sans session : indexer une page vide dessert le site
          "/playlists",
          "/hors-ligne",
          "/hors-connexion",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
