"use client";
import { useState } from "react";
import Link from "next/link";
import { useLibrary } from "@/components/providers/LibraryProvider";
import { SongRow } from "@/components/library/SongRow";
import { ArtistCard } from "@/components/library/ArtistCard";
import { LoginNeeded } from "@/components/library/LoginNeeded";
import { Icon } from "@/components/ui/Icon";

/** Écran 06 « Mes favoris ». Sur desktop : titres et artistes côte à côte. */
export default function FavoritesPage() {
  const lib = useLibrary();
  const [tab, setTab] = useState<"songs" | "artists">("songs");
  const songs = lib.favorites.filter((f) => f.type === "song").map((f) => f.song!);
  const artists = lib.favorites.filter((f) => f.type === "artist").map((f) => f.artist!);

  if (lib.ready && !lib.loggedIn) {
    return (
      <div className="space-y-6 md:space-y-8">
        <h1 className="h-display text-[32px] md:text-5xl">Mes favoris</h1>
        <LoginNeeded icon="favorite" text="Connecte-toi pour retrouver tes favoris sur tous tes appareils." />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <h1 className="h-display text-[32px] md:text-5xl">Mes favoris</h1>

      {/* Onglets (mobile / tablette) */}
      <div className="flex rounded-[28px] bg-white p-[5px] lg:hidden" role="tablist">
        {(
          [
            ["songs", `Titres · ${songs.length}`],
            ["artists", `Artistes · ${artists.length}`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`h-12 flex-1 rounded-3xl text-[17px] font-extrabold ${tab === key ? "bg-ink text-white" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_minmax(0,420px)]">
        <section className={`space-y-4 ${tab === "songs" ? "" : "hidden lg:block"}`}>
          <h2 className="h-section hidden lg:block">Titres · {songs.length}</h2>
          {songs.length === 0 ? (
            <Empty icon="favorite" text="Touche le cœur d’un titre pour le retrouver ici." />
          ) : (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,360px),1fr))] gap-2.5 md:gap-3">
              {songs.map((s) => (
                <li key={s.songId}>
                  <SongRow song={s} queue={songs} showDownload={false} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`space-y-4 ${tab === "artists" ? "" : "hidden lg:block"}`}>
          <h2 className="h-section">Artistes favoris</h2>
          {artists.length === 0 ? (
            <Empty icon="mic_external_on" text="Ajoute un artiste depuis sa page." link={{ href: "/artistes", label: "Voir les artistes" }} />
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
              {artists.map((a) => (
                <li key={a.slug}>
                  <ArtistCard {...a} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Empty({ icon, text, link }: { icon: string; text: string; link?: { href: string; label: string } }) {
  return (
    <div className="card flex flex-col items-center gap-3 p-8 text-center">
      <Icon name={icon} size={40} className="text-pink" />
      <p className="text-muted">{text}</p>
      {link && (
        <Link href={link.href} className="font-bold text-pink">
          {link.label}
        </Link>
      )}
    </div>
  );
}
