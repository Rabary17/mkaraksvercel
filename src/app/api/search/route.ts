import { NextResponse } from "next/server";
import { searchIndex } from "@/lib/search-index";
import { getSearchIndex } from "@/lib/wp";

/** Recherche floue (tolère les fautes de frappe) dans les titres et les noms d'artistes. */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2) {
    return NextResponse.json({ songs: [], songsTotal: 0, artists: [], artistsTotal: 0 });
  }

  const result = searchIndex(await getSearchIndex(), q);

  return NextResponse.json(
    {
      songs: result.songs,
      songsTotal: result.songs.length,
      artists: result.artists,
      artistsTotal: result.artists.length,
    },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
