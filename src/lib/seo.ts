import type { Artist, Song } from "./types";
import { songUrl } from "./wp";

/**
 * Données structurées schema.org.
 *
 * Elles ne servent pas seulement aux résultats enrichis de Google : les moteurs
 * génératifs découpent une page en fragments et citent ce qu'ils peuvent rattacher
 * à une entité nommée.
 *
 * DEUX PAGES BIEN DIFFÉRENTES SE CACHENT DERRIÈRE LA MÊME ROUTE. Mesuré sur huit
 * points du catalogue : 0,8 % des chansons ont un fichier audio, soit ~109 sur
 * 14 517. Les autres ne sont pas vides pour autant — elles portent les paroles
 * complètes, 820 caractères en médiane. Les baliser toutes en MusicRecording
 * annonçait un enregistrement écoutable là où il n'y a qu'un texte.
 */

/** Même origine que `metadataBase` dans app/layout.tsx — les deux doivent rester d'accord. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://mkaraks.com").replace(/\/$/, "");

/** Hote du domaine canonique : sert a reconnaitre un deploiement servi ailleurs. */
export const SITE_HOST = new URL(SITE_URL).host;

export const absolute = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/** Langue du catalogue. Reprend <html lang> de app/layout.tsx. */
const LANG = "mg";

/**
 * Source unique de la distinction, partagée par le balisage, les métadonnées et
 * le sitemap. Si elle divergeait entre eux, une page serait annoncée jouable
 * dans le sitemap et décrite comme un texte dans sa propre balise.
 */
export const estJouable = (song: Song) => Boolean(song.media.audio);

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

function artisteNode(artist: NonNullable<Song["media"]["artist"]>): JsonLdNode {
  return {
    "@type": "MusicGroup",
    "@id": `${absolute(`/artiste/${artist.slug}`)}#artist`,
    name: artist.name,
    url: absolute(`/artiste/${artist.slug}`),
  };
}

/** Ce que la page annonce, en une phrase. Reprise telle quelle en meta description. */
export function songDescription(song: Song): string {
  const de = song.media.artist ? ` de ${song.media.artist.name}` : "";
  return estJouable(song)
    ? `Chante « ${song.title} »${de} en karaoké, avec paroles synchronisées et accords.`
    : `Paroles de « ${song.title} »${de}, en malagasy.`;
}

export function songJsonLd(song: Song): JsonLdNode {
  const artist = song.media.artist;
  const url = absolute(songUrl(song));
  const jouable = estJouable(song);

  // MusicRecording = un enregistrement qu'on peut écouter.
  // MusicComposition = l'œuvre elle-même, dont cette page donne les paroles.
  const principal: JsonLdNode = {
    "@type": jouable ? "MusicRecording" : "MusicComposition",
    "@id": `${url}#${jouable ? "recording" : "composition"}`,
    name: song.title,
    url,
    inLanguage: LANG,
    description: songDescription(song),
  };

  if (jouable) {
    if (artist) principal.byArtist = artisteNode(artist);
    if (song.media.genre) principal.genre = song.media.genre;
    const extra = extras(song);
    if (extra.length) principal.additionalProperty = extra;
  } else if (artist) {
    // Une composition n'a pas de byArtist : l'interprète se rattache par l'enregistrement.
    // Le texte des paroles n'est pas recopié ici — il est déjà dans le corps de la
    // page, et le dupliquer doublerait son poids sans rien apprendre à personne.
    principal.recordedAs = { "@type": "MusicRecording", name: song.title, byArtist: artisteNode(artist) };
    principal.lyrics = { "@type": "CreativeWork", inLanguage: LANG };
  }

  const crumbs = [{ name: "Accueil", path: "/" }];
  if (artist) crumbs.push({ name: artist.name, path: `/artiste/${artist.slug}` });
  crumbs.push({ name: song.title, path: songUrl(song) });

  return { "@context": "https://schema.org", "@graph": [principal, breadcrumb(crumbs)] };
}

export function artistJsonLd(artist: Artist, songs: { title: string; url: string }[]): JsonLdNode {
  const url = absolute(`/artiste/${artist.slug}`);

  const group: JsonLdNode = {
    "@type": "MusicGroup",
    "@id": `${url}#artist`,
    name: artist.name,
    url,
    description: `${artist.name} sur Mkaraks : ${songs.length} titre${songs.length > 1 ? "s" : ""} avec paroles.`,
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
        description: "Paroles et karaoké malagasy, avec paroles synchronisées et accords sur les titres jouables.",
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/recherche?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}
