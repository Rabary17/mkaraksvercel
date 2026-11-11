import { NextResponse } from "next/server";
import { getUid } from "@/lib/firebase-session";
import { userCollection } from "@/lib/library-server";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "login_required" }, { status: 401 });
  const { id } = await params;
  await userCollection(uid, "playlists").doc(id).delete();
  return NextResponse.json({ ok: true });
}
