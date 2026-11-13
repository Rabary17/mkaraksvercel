import { getUid } from "@/lib/firebase-session";
import { getSongById } from "@/lib/wp";
import { signGcsUrl } from "@/lib/gcs";
import { encryptedObjectName, safeObjectPath } from "@/lib/media-keys";
import { MEDIA_KINDS, type MediaKind } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Proxy du bucket privé : le navigateur ne voit que mkaraks.com/media/{id}/{type}.
 * Le contenu renvoyé est CHIFFRÉ (AES-GCM) ; la clé vient de /api/songs/[id]/manifest.
 * La réponse est streamée pour ne pas tomber sur la limite de taille des fonctions Vercel.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; kind: string }> }) {
  if (!(await getUid())) return new Response("login_required", { status: 401 });

  const { id: rawId, kind } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || !MEDIA_KINDS.includes(kind as MediaKind)) {
    return new Response("bad_request", { status: 400 });
  }

  const song = await getSongById(id);
  const path = safeObjectPath(song?.media[kind as MediaKind]);
  if (!path) return new Response("not_found", { status: 404 });

  const upstream = await fetch(signGcsUrl(encryptedObjectName(path), 60), { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return new Response("upstream_error", { status: upstream.status === 404 ? 404 : 502 });
  }

  const headers = new Headers({
    "Content-Type": "application/octet-stream",
    "Cache-Control": "private, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  });
  const len = upstream.headers.get("Content-Length");
  if (len) headers.set("Content-Length", len);

  return new Response(upstream.body, { status: 200, headers });
}
