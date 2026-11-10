import "server-only";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variable d'environnement manquante : ${name}`);
  return v;
}

export const env = {
  get wpUrl() {
    return required("WP_URL").replace(/\/$/, "");
  },
  get wpSecret() {
    return required("WP_HEADLESS_SECRET");
  },
  get revalidateSecret() {
    return required("REVALIDATE_SECRET");
  },
  get sessionSecret() {
    return new TextEncoder().encode(required("SESSION_SECRET"));
  },
  get gcsBucket() {
    return process.env.GCS_BUCKET || "mkaraksbucket";
  },
  get gcsPrefix() {
    return process.env.GCS_PREFIX ?? "enc/";
  },
  get gcsClientEmail() {
    return required("GCS_CLIENT_EMAIL");
  },
  get gcsPrivateKey() {
    return required("GCS_PRIVATE_KEY").replace(/\\n/g, "\n");
  },
  get mediaMasterKey() {
    const key = Buffer.from(required("MEDIA_MASTER_KEY"), "base64");
    if (key.length !== 32) throw new Error("MEDIA_MASTER_KEY doit faire 32 octets (base64)");
    return key;
  },
  get offlineKeyDays() {
    return Number(process.env.OFFLINE_KEY_DAYS || 30);
  },
};
