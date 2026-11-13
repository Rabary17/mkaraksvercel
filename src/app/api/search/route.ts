import { NextResponse } from "next/server";
import { getLatestSongs, searchArtists, toLite } from "@/lib/wp";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Seuls les titres qui contiennent la recherche sont listés : pas de recherche dans les paroles. */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2) {
    return NextResponse.json({ songs: [], songsTotal: 0, artists: [], artistsTotal: 0 });
  }
  const key = norm(q);

  const [byText, artists] = await Promise.all([getLatestSongs(1, q), searchArtists(q)]);

  const songs = byText.songs.filter((song) => norm(song.title).includes(key)).map(toLite);

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
