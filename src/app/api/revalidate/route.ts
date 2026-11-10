import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { env } from "@/lib/env";

/** Appelé par WordPress (plugin mkaraks-headless) quand une chanson ou un artiste change. */
export async function POST(req: Request) {
  if (req.headers.get("x-revalidate-secret") !== env.revalidateSecret) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as { tags?: string[] };
  const tags = body.tags?.length ? body.tags : ["wp"];
  tags.forEach((t) => revalidateTag(t));
  return NextResponse.json({ revalidated: tags });
}
