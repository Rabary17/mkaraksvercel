import * as admin from "firebase-admin";

const adminSdkB64 = process.env.FIREBASE_ADMIN_SDK_B64;
if (!adminSdkB64) {
  throw new Error("FIREBASE_ADMIN_SDK_B64 not set in environment");
}

interface AdminServiceAccount {
  type: string;
  project_id: string;
  private_key: string;
  client_email: string;
}

const adminSdkJson = JSON.parse(Buffer.from(adminSdkB64, "base64").toString("utf-8")) as AdminServiceAccount;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(adminSdkJson),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
