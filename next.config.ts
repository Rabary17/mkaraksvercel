import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: false, // ne pas couper une chanson en cours au retour du réseau
  disable: process.env.NODE_ENV === "development",
  // La page hors ligne doit exister dans le cache dès l'installation du service worker.
  additionalPrecacheEntries: [{ url: "/hors-ligne", revision: process.env.VERCEL_GIT_COMMIT_SHA ?? String(Date.now()) }],
});

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  // firebase-admin (via jwks-rsa -> jose) casse si webpack l'empaquette : l'ESM
  // de jose se mélange avec le require() CommonJS de jwks-rsa. Laisser Node
  // le charger nativement au runtime plutôt que de le bundler.
  serverExternalPackages: ["firebase-admin"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ];
  },
  // Les anciennes URLs WordPress terminent par "/" : on garde la compatibilité.
  trailingSlash: false,
};

export default withSerwist(nextConfig);
