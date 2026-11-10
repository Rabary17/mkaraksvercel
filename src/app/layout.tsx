import type { Metadata, Viewport } from "next";
import { Figtree, Unbounded } from "next/font/google";
import "./globals.css";
import { PlayerProvider } from "@/components/player/PlayerProvider";
import { KaraokePlayer } from "@/components/player/KaraokePlayer";
import { UserProvider } from "@/components/providers/UserProvider";
import { LibraryProvider } from "@/components/providers/LibraryProvider";

const unbounded = Unbounded({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-unbounded", display: "swap" });
const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-figtree", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://mkaraks.com"),
  title: { default: "Mkaraks – Karaoké 100% malagasy", template: "%s – Mkaraks" },
  description: "Chante tes chansons malagasy préférées en karaoké, même sans connexion.",
  applicationName: "Mkaraks",
  appleWebApp: { capable: true, title: "Mkaraks", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#fff8ef",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mg" className={`${unbounded.variable} ${figtree.variable}`}>
      <head>
        {/* Icônes de la maquette (Material Symbols Rounded) */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400..700,0..1,0&display=block"
        />
      </head>
      <body className="min-h-dvh antialiased">
        <UserProvider>
          <LibraryProvider>
            <PlayerProvider>
              {children}
              <KaraokePlayer />
            </PlayerProvider>
          </LibraryProvider>
        </UserProvider>
      </body>
    </html>
  );
}
