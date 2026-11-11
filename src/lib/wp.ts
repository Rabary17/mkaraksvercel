import "server-only";
import { env } from "./env";
import type { Artist, Song, SongMedia } from "./types";

const REVALIDATE = 3600; // 1 h ; le webhook /api/revalidate force la mise à jour immédiate

const SONG_FIELDS = "id,slug,title,mkaraks";

interface WpSong {
  id: number;
  slug: string;
  title: { rendered: string };
  content?: { rendered: string };
  mkaraks?: SongMedia;
}
interface WpTerm {
  id: number;
  slug: string;
  name: string;
  count: number;
}

const EMPTY_MEDIA: SongMedia = { artist: null, audio: null, lyrics: null, chord: null, key: null, bpm: null, genre: null };

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function wpFetch<T>(path: string, tags: string[], revalidate = REVALIDATE): Promise<{ data: T; total: number }> {
  const res = await fetch(`${env.wpUrl}/wp-json${path}`, {
    next: { revalidate, tags: ["wp", ...tags] },
  });
  if (!res.ok) throw new Error(`WordPress ${res.status} sur ${path}`);
  return { data: (await res.json()) as T, total: Number(res.headers.get("X-WP-Total") || 0) };
}

function toSong(s: WpSong): Song {
  return {
    id: s.id,
    slug: s.slug,
    title: decodeEntities(s.title.rendered),
    lyricsHtml: s.content?.rendered,
    media: s.mkaraks ?? EMPTY_MEDIA,
  };
}

function toArtist(t: WpTerm): Artist {
  return { id: t.id, slug: t.slug, name: decodeEntities(t.name), count: t.count };
}

export async function getLatestSongs(page = 1, search?: string) {
  const q = new URLSearchParams({ per_page: "24", page: String(page), _fields: SONG_FIELDS });
  if (search) q.set("search", search);
  const { data, total } = await wpFetch<WpSong[]>(`/wp/v2/karaoke?${q}`, ["songs"]);
  return { songs: data.map(toSong), total };
}

export async function getSong(slug: string): Promise<Song | null> {
  const q = new URLSearchParams({ slug, _fields: `${SONG_FIELDS},content` });
  const { data } = await wpFetch<WpSong[]>(`/wp/v2/karaoke?${q}`, ["songs", `song:${slug}`]);
  return data[0] ? toSong(data[0]) : null;
}

export async function getSongById(id: number): Promise<Song | null> {
  try {
    const { data } = await wpFetch<WpSong>(`/wp/v2/karaoke/${id}?_fields=${SONG_FIELDS}`, ["songs"]);
    return toSong(data);
  } catch {
    return null;
  }
}

export async function getArtist(slug: string): Promise<Artist | null> {
  const { data } = await wpFetch<WpTerm[]>(`/wp/v2/artist?slug=${encodeURIComponent(slug)}`, [`artist:${slug}`]);
  return data[0] ? toArtist(data[0]) : null;
}

export async function getArtistSongs(artistId: number) {
  const q = new URLSearchParams({ artist: String(artistId), per_page: "100", _fields: SONG_FIELDS, orderby: "title", order: "asc" });
  const { data } = await wpFetch<WpSong[]>(`/wp/v2/karaoke?${q}`, ["songs"]);
  return data.map(toSong);
}

export async function getArtists(page = 1) {
  const q = new URLSearchParams({ per_page: "60", page: String(page), orderby: "count", order: "desc", hide_empty: "true" });
  const { data, total } = await wpFetch<WpTerm[]>(`/wp/v2/artist?${q}`, ["artists"]);
  return { artists: data.map(toArtist), total };
}

/** Vérifie identifiant/mot de passe auprès de WordPress (appel serveur à serveur). */
export async function wpLogin(username: string, password: string) {
  const res = await fetch(`${env.wpUrl}/wp-json/mkaraks/v1/auth`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json", "X-Mkaraks-Secret": env.wpSecret },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) return null;
  return (await res.json()) as { id: number; name: string };
}

/** Crée le compte dans WordPress (rôle abonné). */
export async function wpRegister(
  name: string,
  email: string,
  password: string,
): Promise<{ id: number; name: string } | { error: string; status: number }> {
  const res = await fetch(`${env.wpUrl}/wp-json/mkaraks/v1/register`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json", "X-Mkaraks-Secret": env.wpSecret },
    body: JSON.stringify({ name, email, password }),
  });
  const data = (await res.json().catch(() => ({}))) as { id?: number; name?: string; message?: string };
  if (!res.ok || !data.id) return { error: data.message ?? "Inscription impossible.", status: res.status === 409 ? 409 : 400 };
  return { id: data.id, name: data.name ?? name };
}

/* -------------------------------------------------------------------------- */
/* Sitemap : parcours complet du catalogue                                     */
/* -------------------------------------------------------------------------- */

/** Maximum autorisé par l'API REST de WordPress. */
const SITEMAP_PER_PAGE = 100;

/**
 * Le sitemap se met a jour une fois par jour, et porte un tag A LUI.
 * Avec le tag "songs", la moindre correction de typo dans WordPress purgerait
 * le cache et relancerait les 146 requetes du parcours complet.
 */
const SITEMAP_REVALIDATE = 86400;
const SITEMAP_TAG = ["sitemap"];

/**
 * 146 requêtes enchaînées dépasseraient le délai d'exécution de Vercel ; 146 d'un
 * coup mettraient WordPress à genoux. On avance donc par lots.
 */
async function inBatches<T>(count: number, run: (n: number) => Promise<T>, size = 16): Promise<T[]> {
  const out: T[] = [];
  for (let start = 1; start <= count; start += size) {
    const batch = Array.from({ length: Math.min(size, count - start + 1) }, (_, i) => start + i);
    out.push(...(await Promise.all(batch.map(run))));
  }
  return out;
}

export interface SitemapEntry {
  path: string;
  lastModified?: Date;
}

interface WpSitemapSong {
  slug: string;
  modified?: string;
  mkaraks?: { artist: { slug: string } | null };
}

/**
 * Toutes les pages d'un type, en paginant sur un ordre STABLE (`id` croissant).
 * L'ordre par défaut est la date : un article republié se déplacerait d'une page
 * à l'autre pendant le parcours, et une URL serait vue deux fois ou jamais.
 */
async function allPages<T>(path: string, tags: string[]): Promise<T[]> {
  const url = (page: number) => `${path}&per_page=${SITEMAP_PER_PAGE}&page=${page}&orderby=id&order=asc`;
  const first = await wpFetch<T[]>(url(1), tags, SITEMAP_REVALIDATE);
  const pages = Math.ceil(first.total / SITEMAP_PER_PAGE);
  if (pages <= 1) return first.data;
  const rest = await inBatches(pages - 1, (n) => wpFetch<T[]>(url(n + 1), tags, SITEMAP_REVALIDATE).then((r) => r.data));
  return [first.data, ...rest].flat();
}

export async function getAllSongPaths(): Promise<SitemapEntry[]> {
  const songs = await allPages<WpSitemapSong>("/wp/v2/karaoke?_fields=slug,modified,mkaraks", SITEMAP_TAG);
  return songs.map((s) => ({
    path: `/artist/${s.mkaraks?.artist?.slug ?? "inconnu"}/${s.slug}`,
    lastModified: s.modified ? new Date(s.modified) : undefined,
  }));
}

export async function getAllArtistPaths(): Promise<SitemapEntry[]> {
  const terms = await allPages<{ slug: string }>("/wp/v2/artist?_fields=slug&hide_empty=true", SITEMAP_TAG);
  return terms.map((t) => ({ path: `/artiste/${t.slug}` }));
}

export function songUrl(song: Song) {
  return `/artist/${song.media.artist?.slug ?? "inconnu"}/${song.slug}`;
}

/** Données sérialisables passées aux composants client (listes, lecteur, favoris). */
export function toLite(song: Song) {
  return {
    songId: song.id,
    title: song.title,
    artist: song.media.artist?.name ?? "",
    artistSlug: song.media.artist?.slug,
    url: songUrl(song),
  };
}
