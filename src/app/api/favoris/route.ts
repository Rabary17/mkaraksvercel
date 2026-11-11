import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

async function getUserFromSession(req: NextRequest) {
  const sessionCookie = req.cookies.get("__session")?.value;
  if (!sessionCookie) return null;

  try {
    const decodedCookie = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decodedCookie.uid;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const uid = await getUserFromSession(req);
  if (!uid) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  const snapshot = await adminDb
    .collection("users")
    .doc(uid)
    .collection("favoris")
    .orderBy("addedAt", "desc")
    .get();

  const favoris = snapshot.docs.map((doc) => doc.data());
  return NextResponse.json(favoris);
}

export async function POST(req: NextRequest) {
  const uid = await getUserFromSession(req);
  if (!uid) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  const { songId } = await req.json();
  if (!songId) {
    return NextResponse.json({ error: "songId requis" }, { status: 400 });
  }

  await adminDb
    .collection("users")
    .doc(uid)
    .collection("favoris")
    .doc(String(songId))
    .set({ songId, addedAt: Date.now() }, { merge: true });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const uid = await getUserFromSession(req);
  if (!uid) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  const { songId } = await req.json();
  if (!songId) {
    return NextResponse.json({ error: "songId requis" }, { status: 400 });
  }

  await adminDb
    .collection("users")
    .doc(uid)
    .collection("favoris")
    .doc(String(songId))
    .delete();

  return NextResponse.json({ success: true });
}
