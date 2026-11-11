import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get("__session")?.value;
  if (!sessionCookie) {
    return NextResponse.json({ user: null });
  }

  try {
    const decodedCookie = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decodedCookie.uid;

    const userDoc = await adminDb.collection("users").doc(uid).get();
    const user = userDoc.data();

    return NextResponse.json({ user: user || null });
  } catch {
    return NextResponse.json({ user: null });
  }
}
