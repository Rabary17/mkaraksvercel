import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.idToken) {
      return NextResponse.json(
        { error: "ID token requis (utilisez Firebase Auth côté client)." },
        { status: 400 }
      );
    }

    // Vérifier le token Firebase
    const decodedToken = await adminAuth.verifyIdToken(body.idToken);
    const uid = decodedToken.uid;

    // Récupérer l'utilisateur depuis Firestore
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const user = userDoc.data();

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé." }, { status: 404 });
    }

    // Créer une session cookie
    const sessionCookie = await adminAuth.createSessionCookie(body.idToken, {
      expiresIn: 60 * 60 * 24 * 7 * 1000, // 7 jours
    });

    const response = NextResponse.json({ user });
    response.cookies.set("__session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json({ error: error.message || "Erreur lors de la connexion." }, { status: 401 });
  }
}
