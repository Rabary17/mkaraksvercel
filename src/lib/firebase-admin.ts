import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const adminSdkB64 = process.env.FIREBASE_ADMIN_SDK_B64;
if (!adminSdkB64) {
  throw new Error("FIREBASE_ADMIN_SDK_B64 not set in environment");
}

interface RawServiceAccountJson {
  project_id: string;
  private_key: string;
  client_email: string;
}

const raw = JSON.parse(
  Buffer.from(adminSdkB64, "base64").toString("utf-8")
) as RawServiceAccountJson;

const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert({
        projectId: raw.project_id,
        privateKey: raw.private_key,
        clientEmail: raw.client_email,
      }),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
