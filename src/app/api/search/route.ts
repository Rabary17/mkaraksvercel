import { NextResponse } from "next/server";
import { getArtistSongs, getLatestSongs, searchArtists, toLite } from "@/lib/wp";
import type { Song } from "@/lib/types";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Priorité : titre, puis artiste, puis paroles (10 % d'importance). */
const SCORE_TITLE = 1;
const SCORE_ARTIST = 0.5;
const SCORE_LYRICS = 0.1;

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2) {
    return NextResponse.json({ songs: [], songsTotal: 0, artists: [], artistsTotal: 0 });
  }
  const key = norm(q);

  const [byText, artists] = await Promise.all([getLatestSongs(1, q), searchArtists(q)]);
  const matchedArtists = artists.artists.filter((a) => norm(a.name).includes(key)).slice(0, 3);
  const byArtist = (await Promise.all(matchedArtists.map((a) => getArtistSongs(a.id)))).flat();

  const scored = new Map<number, { song: Song; score: number }>();
  for (const song of [...byText.songs, ...byArtist]) {
    if (scored.has(song.id)) continue;
    const artistName = song.media.artist?.name ?? "";
    const titleHit = norm(song.title).includes(key);
    const artistHit = norm(artistName).includes(key) || matchedArtists.some((a) => a.id === song.media.artist?.id);
    const score = titleHit ? SCORE_TITLE : artistHit ? SCORE_ARTIST : SCORE_LYRICS;
    scored.set(song.id, { song, score });
  }
  const songs = [...scored.values()].sort((a, b) => b.score - a.score).map((x) => x.song);

  return NextResponse.json(
    {
      songs: songs.map(toLite),
      songsTotal: songs.length,
      artists: artists.artists.map(({ slug, name, count }) => ({ slug, name, count })),
      artistsTotal: artists.total,
    },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
