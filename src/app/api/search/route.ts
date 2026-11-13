import { NextResponse } from "next/server";
import { getLatestSongs, searchArtists, toLite } from "@/lib/wp";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Chansons : le titre passe avant les paroles (poids 10 %). Un titre qui ne correspond qu'à l'artiste n'est pas listé : l'artiste l'est. */
const SCORE_TITLE = 1;
const SCORE_LYRICS = 0.1;

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2) {
    return NextResponse.json({ songs: [], songsTotal: 0, artists: [], artistsTotal: 0 });
  }
  const key = norm(q);

  const [byText, artists] = await Promise.all([getLatestSongs(1, q), searchArtists(q)]);

  const songs = byText.songs
    .map((song) => ({
      song,
      titleHit: norm(song.title).includes(key),
      artistHit: norm(song.media.artist?.name ?? "").includes(key),
    }))
    .filter((x) => x.titleHit || !x.artistHit)
    .map((x) => ({ song: x.song, score: x.titleHit ? SCORE_TITLE : SCORE_LYRICS }))
    .sort((a, b) => b.score - a.score)
    .map((x) => toLite(x.song));

  const matchedArtists = artists.artists
    .filter((a) => norm(a.name).includes(key))
    .map(({ slug, name, count }) => ({ slug, name, count }));

  return NextResponse.json(
    {
      songs,
      songsTotal: songs.length,
      artists: matchedArtists,
      artistsTotal: matchedArtists.length,
    },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
