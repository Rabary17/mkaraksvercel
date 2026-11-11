import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.email || !body?.password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis." },
        { status: 400 }
      );
    }

    // Créer l'utilisateur dans Firebase Auth
    const userRecord = await adminAuth.createUser({
      email: body.email,
      password: body.password,
      displayName: body.name,
    });

    // Enregistrer dans Firestore
    await adminDb.collection("users").doc(userRecord.uid).set({
      id: userRecord.uid,
      email: body.email,
      name: body.name || "",
      createdAt: Date.now(),
    });

    // Créer un token custom
    const token = await adminAuth.createCustomToken(userRecord.uid);

    return NextResponse.json({ user: { id: userRecord.uid, email: body.email }, token });
  } catch (error: any) {
    console.error("Register error:", error);
    if (error.code === "auth/email-already-exists") {
      return NextResponse.json({ error: "Cet email existe déjà." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || "Erreur lors de l'inscription." }, { status: 500 });
  }
}
