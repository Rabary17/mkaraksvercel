"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArtistCard } from "@/components/library/ArtistCard";
import { SongGrid } from "@/components/library/SongRow";
import { Icon } from "@/components/ui/Icon";
import type { SongLite } from "@/lib/client/db";

interface SearchResult {
  songs: SongLite[];
  songsTotal: number;
  artists: { slug: string; name: string; count: number }[];
  artistsTotal: number;
}

/** Résultats complets de la recherche, lus dans l'URL (?q=) : la barre de recherche de l'application les met à jour. */
export function SearchView() {
  const query = (useSearchParams().get("q") ?? "").trim();
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResult(null);
      setLoading(false);
      setError(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        setResult((await res.json()) as SearchResult);
        setError(false);
      } catch {
        if (!ctrl.signal.aborted) setError(true);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  const searching = query.length >= 2;

  return (
    <div className="space-y-6 md:space-y-8">
      {!searching && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/artistes" className="flex items-center gap-4 rounded-[24px] bg-lilac p-5 font-display text-lg font-bold">
            <Icon name="mic_external_on" size={32} /> Parcourir les artistes
          </Link>
          <Link href="/" className="flex items-center gap-4 rounded-[24px] bg-mint p-5 font-display text-lg font-bold">
            <Icon name="library_music" size={32} /> Tous les karaokés
          </Link>
          <Link href="/favoris" className="flex items-center gap-4 rounded-[24px] bg-pink-soft p-5 font-display text-lg font-bold">
            <Icon name="favorite" filled size={32} /> Mes favoris
          </Link>
        </div>
      )}

      {searching && error && <p className="text-pink">La recherche est indisponible pour le moment. Réessaie dans un instant.</p>}

      {searching && !error && !result && <p className="text-muted">Recherche…</p>}

      {searching && result && (
        <div className={`grid gap-10 transition-opacity duration-300 lg:grid-cols-[minmax(0,1fr)_420px] ${loading ? "opacity-60" : "opacity-100"}`}>
          <section className="order-1 space-y-4 lg:order-2">
            <h2 className="h-section">Artistes</h2>
            {result.artists.length === 0 ? (
              <p className="text-muted">Aucun artiste trouvé.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
                {result.artists.map((a) => (
                  <li key={a.slug}>
                    <ArtistCard slug={a.slug} name={a.name} count={a.count} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="order-2 space-y-4 lg:order-1">
            <h2 className="h-section">Titres · {result.songsTotal}</h2>
            <SongGrid songs={result.songs} empty="Aucun titre trouvé." />
          </section>
        </div>
      )}
    </div>
  );
}
