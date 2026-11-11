import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FirebaseError } from "firebase-admin";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.email || !body?.password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis." },
        { status: 400 }
      );
    }

    const userRecord = await adminAuth.createUser({
      email: body.email,
      password: body.password,
      displayName: body.name,
    });

    await adminDb.collection("users").doc(userRecord.uid).set({
      id: userRecord.uid,
      email: body.email,
      name: body.name || "",
      createdAt: Date.now(),
    });

    const token = await adminAuth.createCustomToken(userRecord.uid);

    return NextResponse.json({ user: { id: userRecord.uid, email: body.email }, token });
  } catch (error: unknown) {
    console.error("Register error:", error);
    if (error instanceof FirebaseError) {
      if (error.code === "auth/email-already-exists") {
        return NextResponse.json({ error: "Cet email existe déjà." }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Erreur lors de l'inscription." }, { status: 500 });
  }
}
