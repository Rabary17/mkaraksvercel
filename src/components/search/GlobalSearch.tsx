"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

interface QuickResult {
  songs: { songId: number; title: string; artist: string; url: string }[];
  songsTotal: number;
  artists: { slug: string; name: string; count: number }[];
  artistsTotal: number;
}

/** Barre de recherche commune à toutes les pages : résultats rapides, puis page complète. */
export function GlobalSearch() {
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<QuickResult | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResult(null);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (res.ok) setResult((await res.json()) as QuickResult);
      } catch {
        /* recherche interrompue ou hors ligne : on garde le dernier résultat */
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const q = query.trim();
  const showPanel = open && q.length >= 2 && result !== null;

  return (
    <div ref={boxRef} className="relative w-full max-w-xl">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (!q) return;
          setOpen(false);
          router.push(`/recherche?q=${encodeURIComponent(q)}`);
        }}
        className="relative"
      >
        <Icon name="search" size={22} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2" />
        <input
          type="search"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          placeholder="Titre ou artiste…"
          aria-label="Rechercher un titre ou un artiste"
          className="field h-12 w-full pl-12"
        />
      </form>

      {showPanel && result && (
        <div className="absolute top-full right-0 left-0 z-50 mt-2 max-h-[60dvh] overflow-y-auto rounded-[20px] bg-white p-3 shadow-lg">
          {result.artists.slice(0, 3).map((a) => (
            <Link
              key={a.slug}
              href={`/artiste/${a.slug}`}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-2xl p-2 font-bold hover:bg-sand"
            >
              <span>{a.name}</span>
              <span className="text-sm text-muted">{a.count} karaokés</span>
            </Link>
          ))}
          {result.songs.slice(0, 6).map((s) => (
            <Link key={s.songId} href={s.url} onClick={() => setOpen(false)} className="block rounded-2xl p-2 hover:bg-sand">
              <span className="block font-bold">{s.title}</span>
              <span className="block text-sm text-muted">{s.artist}</span>
            </Link>
          ))}
          {result.songs.length === 0 && result.artists.length === 0 && <p className="p-2 text-muted">Aucun résultat.</p>}
          <Link
            href={`/recherche?q=${encodeURIComponent(q)}`}
            onClick={() => setOpen(false)}
            className="mt-2 block rounded-2xl p-2 text-center font-bold text-pink"
          >
            Voir tous les résultats
          </Link>
        </div>
      )}
    </div>
  );
}
