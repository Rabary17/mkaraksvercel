import type { Artist, Song } from "./types";
import { songUrl } from "./wp";

/**
 * Données structurées schema.org.
 *
 * Elles ne servent pas seulement aux résultats enrichis de Google : les moteurs
 * génératifs découpent une page en fragments et citent ce qu'ils peuvent rattacher
 * à une entité nommée. Une chanson sans `MusicRecording` est un bloc de texte ;
 * avec, c'est un enregistrement, d'un artiste, dans une langue, d'un genre.
 */

/** Même origine que `metadataBase` dans app/layout.tsx — les deux doivent rester d'accord. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://mkaraks.com").replace(/\/$/, "");

/** Hote du domaine canonique : sert a reconnaitre un deploiement servi ailleurs. */
export const SITE_HOST = new URL(SITE_URL).host;

export const absolute = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/** Langue du catalogue. Reprend <html lang> de app/layout.tsx. */
const LANG = "mg";

type JsonLdNode = Record<string, unknown>;

function breadcrumb(items: { name: string; path: string }[]): JsonLdNode {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absolute(it.path),
    })),
  };
}

/** Tonalité et tempo n'ont pas de propriété schema.org dédiée : on passe par additionalProperty. */
function extras(song: Song): JsonLdNode[] {
  const out: JsonLdNode[] = [];
  if (song.media.key) out.push({ "@type": "PropertyValue", name: "Tonalité", value: song.media.key });
  if (song.media.bpm) out.push({ "@type": "PropertyValue", name: "Tempo", value: song.media.bpm, unitText: "BPM" });
  return out;
}

export function songJsonLd(song: Song): JsonLdNode {
  const artist = song.media.artist;
  const url = absolute(songUrl(song));
  const extra = extras(song);

  const recording: JsonLdNode = {
    "@type": "MusicRecording",
    "@id": `${url}#recording`,
    name: song.title,
    url,
    inLanguage: LANG,
    description: artist
      ? `Version karaoké de « ${song.title} » de ${artist.name}, avec paroles synchronisées.`
      : `Version karaoké de « ${song.title} », avec paroles synchronisées.`,
  };
  if (artist) {
    recording.byArtist = {
      "@type": "MusicGroup",
      "@id": `${absolute(`/artiste/${artist.slug}`)}#artist`,
      name: artist.name,
      url: absolute(`/artiste/${artist.slug}`),
    };
  }
  if (song.media.genre) recording.genre = song.media.genre;
  if (extra.length) recording.additionalProperty = extra;

  const crumbs = [{ name: "Accueil", path: "/" }];
  if (artist) crumbs.push({ name: artist.name, path: `/artiste/${artist.slug}` });
  crumbs.push({ name: song.title, path: songUrl(song) });

  return { "@context": "https://schema.org", "@graph": [recording, breadcrumb(crumbs)] };
}

export function artistJsonLd(artist: Artist, songs: { title: string; url: string }[]): JsonLdNode {
  const url = absolute(`/artiste/${artist.slug}`);

  const group: JsonLdNode = {
    "@type": "MusicGroup",
    "@id": `${url}#artist`,
    name: artist.name,
    url,
    description: `${artist.name} sur Mkaraks : ${songs.length} karaoké${songs.length > 1 ? "s" : ""} avec paroles synchronisées.`,
  };

  // Le catalogue entier d'un artiste prolifique gonflerait la page pour rien : on cite les 50 premiers.
  if (songs.length) {
    group.track = songs.slice(0, 50).map((s) => ({
      "@type": "MusicRecording",
      name: s.title,
      url: absolute(s.url),
    }));
  }

  return {
    "@context": "https://schema.org",
    "@graph": [
      group,
      breadcrumb([
        { name: "Accueil", path: "/" },
        { name: "Artistes", path: "/artistes" },
        { name: artist.name, path: `/artiste/${artist.slug}` },
      ]),
    ],
  };
}

/** Identité du site, posée une fois sur l'accueil. */
export function siteJsonLd(): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}#website`,
        name: "Mkaraks",
        url: SITE_URL,
        inLanguage: LANG,
        description: "Karaoké malagasy avec paroles synchronisées et accords, jouable hors connexion.",
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/recherche?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}
