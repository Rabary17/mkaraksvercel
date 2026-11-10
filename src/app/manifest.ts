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
    // À remplacer par les vrais logos PNG 192/512 (voir README).
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
    shortcuts: [
      { name: "Hors ligne", url: "/hors-ligne" },
      { name: "Favoris", url: "/favoris" },
      { name: "Playlists", url: "/playlists" },
    ],
  };
}
