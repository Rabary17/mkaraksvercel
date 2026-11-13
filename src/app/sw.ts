/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Médias et API sensibles : jamais mis en cache automatiquement.
    // Seul le bouton « Télécharger » les range (cache "mkaraks-media", géré par l'app).
    { matcher: ({ url }) => url.pathname.startsWith("/media/"), handler: new NetworkOnly() },
    { matcher: ({ url }) => url.pathname.startsWith("/api/"), handler: new NetworkOnly() },
    // Morceaux JS de Next (noms versionnés, donc immuables) : gardés durablement,
    // y compris le décodeur Opus de secours (≈ 4 Mo, trop gros pour le précache).
    {
      matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/_next/static/chunks/"),
      handler: new CacheFirst({
        cacheName: "mkaraks-js",
        plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 })],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [{ url: "/hors-ligne", matcher: ({ request }) => request.destination === "document" }],
  },
});

serwist.addEventListeners();
