"use client";
import { useEffect, useState } from "react";
import { useLibrary } from "@/components/providers/LibraryProvider";
import { useUser } from "@/components/providers/UserProvider";
import { SongRow } from "@/components/library/SongRow";
import { Icon } from "@/components/ui/Icon";
import { getPrefs, setPrefs } from "@/lib/client/prefs";
import type { SongLite } from "@/lib/client/db";

/** Écran 08 « Hors ligne » : bandeau d'état, réglage Wi-Fi, titres téléchargés. */
export default function OfflinePage() {
  const lib = useLibrary();
  const { online } = useUser();
  const [wifiOnly, setWifiOnly] = useState(true);
  const [usage, setUsage] = useState("");

  useEffect(() => {
    setWifiOnly(getPrefs().wifiOnly);
    navigator.storage
      ?.estimate?.()
      .then((e) => e.usage != null && e.quota && setUsage(`${(e.usage / 1e6).toFixed(0)} Mo utilisés sur ${(e.quota / 1e9).toFixed(1)} Go disponibles`))
      .catch(() => {});
  }, [lib.downloads.length]);

  const songs: (SongLite & { expired: boolean; mb: string })[] = lib.downloads.map((d) => ({
    songId: d.songId,
    title: d.title,
    artist: d.artist,
    artistSlug: d.artistSlug,
    url: d.pageUrl,
    expired: d.offlineUntil < Date.now(),
    mb: (d.bytes / 1e6).toFixed(1),
  }));

  return (
    <div className="space-y-6 md:space-y-8">
      <h1 className="h-display text-[32px] md:text-5xl">Hors ligne</h1>

      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-stretch">
        <div className={`flex gap-4 rounded-[24px] p-[18px] md:p-6 ${online ? "bg-mint" : "bg-yellow"}`}>
          <Icon name={online ? "wifi" : "wifi_off"} size={30} />
          <div>
            <p className="font-display text-lg font-bold">{online ? "Tu es connecté" : "Pas de connexion"}</p>
            <p className="text-[15px]">
              {online
                ? "Télécharge tes titres préférés pour les chanter partout, même sans réseau."
                : "Tu peux chanter tous les karaokés téléchargés, avec paroles et accords."}
            </p>
          </div>
        </div>
        <label className="card flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-bold md:min-w-[320px]">
          Télécharger en Wi-Fi seulement
          <input
            type="checkbox"
            className="peer sr-only"
            checked={wifiOnly}
            onChange={(e) => {
              setWifiOnly(e.target.checked);
              setPrefs({ wifiOnly: e.target.checked });
            }}
          />
          <span className="relative h-7 w-12 shrink-0 rounded-full bg-line transition peer-checked:bg-teal peer-focus-visible:ring-2 peer-focus-visible:ring-ink after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
        </label>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="h-section">Téléchargés · {songs.length}</h2>
          {usage && <span className="text-sm text-muted">{usage}</span>}
        </div>
        {songs.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 p-8 text-center">
            <Icon name="download_for_offline" size={40} className="text-teal" />
            <p className="text-muted">Aucun titre téléchargé. Touche l’icône de téléchargement à côté d’un titre.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,360px),1fr))] gap-2.5 md:gap-3">
            {songs.map((s) => (
              <li key={s.songId} className={s.expired ? "opacity-50" : ""} title={s.expired ? "Reconnecte-toi en ligne pour réactiver ce titre" : `${s.mb} Mo`}>
                <SongRow song={s} queue={songs.filter((x) => !x.expired)} showFavorite={false} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
