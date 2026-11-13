export interface SongLite {
  songId: number;
  title: string;
  artist: string;
  artistSlug?: string;
  url: string;
}

export interface SearchArtist {
  slug: string;
  name: string;
  count: number;
}

export interface SearchIndex {
  songs: { song: SongLite; tokens: string[] }[];
  artists: { artist: SearchArtist; tokens: string[] }[];
}

/** Minuscules, sans accents, sans apostrophes ni tirets, séparateurs remplacés par des espaces. */
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’\-]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const tokensOf = (s: string) => norm(s).split(" ").filter(Boolean);

export function buildSearchIndex(songs: SongLite[], artists: SearchArtist[]): SearchIndex {
  return {
    songs: songs.map((song) => ({ song, tokens: tokensOf(song.title) })),
    artists: artists.map((artist) => ({ artist, tokens: tokensOf(artist.name) })),
  };
}

/** Tolérance aux fautes : plus le mot est long, plus on accepte d'erreurs. */
function allowedErrors(len: number) {
  return len <= 3 ? 0 : len <= 6 ? 1 : 2;
}

/** Distance de Levenshtein, abandonnée dès qu'elle dépasse `max`. */
function distance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return Infinity;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return Infinity;
    prev = cur;
  }
  return prev[b.length] <= max ? prev[b.length] : Infinity;
}

/** Score d'une liste de mots recherchés contre les mots d'un titre ; null si un mot ne correspond pas. */
function score(query: string[], target: string[]): number | null {
  let total = 0;
  for (const q of query) {
    let best = Infinity;
    for (const t of target) {
      if (q.length >= 2 && t.startsWith(q)) {
        best = 0;
        break;
      }
      const d = distance(q, t, allowedErrors(q.length));
      if (d < best) best = d;
    }
    if (best === Infinity) return null;
    total += best;
  }
  return total;
}

export function searchIndex(index: SearchIndex, query: string, limits = { songs: 60, artists: 12 }) {
  const q = tokensOf(query);
  if (q.length === 0) return { songs: [] as SongLite[], artists: [] as SearchArtist[] };

  const songs = index.songs
    .map((e) => ({ song: e.song, s: score(q, e.tokens) }))
    .filter((x): x is { song: SongLite; s: number } => x.s !== null)
    .sort((a, b) => a.s - b.s || a.song.title.localeCompare(b.song.title))
    .slice(0, limits.songs)
    .map((x) => x.song);

  const artists = index.artists
    .map((e) => ({ artist: e.artist, s: score(q, e.tokens) }))
    .filter((x): x is { artist: SearchArtist; s: number } => x.s !== null)
    .sort((a, b) => a.s - b.s || b.artist.count - a.artist.count)
    .slice(0, limits.artists)
    .map((x) => x.artist);

  return { songs, artists };
}
