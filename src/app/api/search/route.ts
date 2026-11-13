import { NextResponse } from "next/server";
import { getLatestSongs, searchArtists, toLite } from "@/lib/wp";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2) {
    return NextResponse.json({ songs: [], songsTotal: 0, artists: [], artistsTotal: 0 });
  }
  const [songs, artists] = await Promise.all([getLatestSongs(1, q), searchArtists(q)]);
  return NextResponse.json(
    {
      songs: songs.songs.map(toLite),
      songsTotal: songs.total,
      artists: artists.artists.map(({ slug, name, count }) => ({ slug, name, count })),
      artistsTotal: artists.total,
    },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
