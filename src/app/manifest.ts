import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mkaraks – Karaoké 100% malagasy",
    short_name: "Mkaraks",
    description: "Chante tes chansons malagasy préférées, même sans connexion.",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#fff8ef",
    theme_color: "#fff8ef",
    lang: "mg",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    shortcuts: [
      { name: "Hors ligne", url: "/hors-ligne" },
      { name: "Favoris", url: "/favoris" },
      { name: "Playlists", url: "/playlists" },
    ],
  };
}
