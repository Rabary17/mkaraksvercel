import "server-only";
import { hkdfSync } from "node:crypto";
import { env } from "./env";

/**
 * Clé AES-256 propre à chaque fichier, dérivée de la clé maîtresse et du chemin d'origine.
 * DOIT rester identique à deriveKey() dans scripts/encrypt-bucket.mjs.
 */
export function deriveFileKey(objectPath: string): Buffer {
  return Buffer.from(hkdfSync("sha256", env.mediaMasterKey, "mkaraks-media-v1", objectPath, 32));
}

/** Le chemin WordPress (ex. "rossy/anilan ny tiana/instrumental.mp3") → objet chiffré dans le bucket. */
export function encryptedObjectName(objectPath: string): string {
  return `${env.gcsPrefix}${objectPath}.enc`;
}

/** Refuse tout chemin suspect avant de signer quoi que ce soit. */
export function safeObjectPath(path: string | null | undefined): string | null {
  if (!path) return null;
  const p = path.trim().replace(/^\/+/, "");
  if (!p || p.includes("..") || /^[a-z]+:\/\//i.test(p)) return null;
  return p;
}
