import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FirebaseError } from "firebase-admin";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.idToken) {
      return NextResponse.json(
        { error: "ID token requis (utilisez Firebase Auth côté client)." },
        { status: 400 }
      );
    }

    const decodedToken = await adminAuth.verifyIdToken(body.idToken);
    const uid = decodedToken.uid;

    const userRef = adminDb.collection("users").doc(uid);
    const userDoc = await userRef.get();
    let user = userDoc.data();

    // Première connexion (inscription email/mdp ou Google) : le document
    // Firestore n'existe pas encore, on le crée à partir du token décodé.
    if (!user) {
      user = {
        id: uid,
        email: decodedToken.email || "",
        name: decodedToken.name || "",
        createdAt: Date.now(),
      };
      await userRef.set(user);
    }

    const sessionCookie = await adminAuth.createSessionCookie(body.idToken, {
      expiresIn: 60 * 60 * 24 * 7 * 1000,
    });

    const response = NextResponse.json({ user });
    response.cookies.set("__session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: unknown) {
    console.error("Login error:", error);
    const message = error instanceof FirebaseError ? error.message : "Erreur lors de la connexion.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
