import "server-only";
import { createHash, createSign } from "node:crypto";
import { env } from "./env";

/**
 * URL signée GCS V4, utilisée UNIQUEMENT côté serveur (le navigateur ne la voit jamais).
 * Durée très courte : elle ne sert qu'au fetch immédiat fait par la route /media.
 */
export function signGcsUrl(objectName: string, ttlSeconds = 60, method: "GET" | "HEAD" = "GET"): string {
  const host = "storage.googleapis.com";
  const now = new Date();
  const datetime = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); // YYYYMMDDTHHMMSSZ
  const date = datetime.slice(0, 8);
  const scope = `${date}/auto/storage/goog4_request`;

  const path = `/${env.gcsBucket}/${objectName.split("/").map(encodeURIComponent).join("/")}`;

  const query: Record<string, string> = {
    "X-Goog-Algorithm": "GOOG4-RSA-SHA256",
    "X-Goog-Credential": `${env.gcsClientEmail}/${scope}`,
    "X-Goog-Date": datetime,
    "X-Goog-Expires": String(ttlSeconds),
    "X-Goog-SignedHeaders": "host",
  };
  const canonicalQuery = Object.keys(query)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`)
    .join("&");

  const canonicalRequest = [method, path, canonicalQuery, `host:${host}`, "", "host", "UNSIGNED-PAYLOAD"].join("\n");
  const stringToSign = [
    "GOOG4-RSA-SHA256",
    datetime,
    scope,
    createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");

  const signature = createSign("RSA-SHA256").update(stringToSign).sign(env.gcsPrivateKey, "hex");
  return `https://${host}${path}?${canonicalQuery}&X-Goog-Signature=${signature}`;
}

/** Génération de l'objet GCS : elle change à chaque écrasement, donc sert de version aux URL média. */
export async function gcsGeneration(objectName: string): Promise<string | null> {
  try {
    const res = await fetch(signGcsUrl(objectName, 60, "HEAD"), { method: "HEAD", cache: "no-store" });
    return res.ok ? res.headers.get("x-goog-generation") : null;
  } catch {
    return null;
  }
}
