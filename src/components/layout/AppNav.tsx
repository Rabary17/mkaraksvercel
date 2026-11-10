"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Blobs";
import { useUser } from "@/components/providers/UserProvider";
import { useLibrary } from "@/components/providers/LibraryProvider";
import { PLAYLIST_BG } from "@/components/library/playlist-colors";

export const NAV = [
  { href: "/", label: "Accueil", icon: "home" },
  { href: "/recherche", label: "Chercher", icon: "search" },
  { href: "/favoris", label: "Favoris", icon: "favorite" },
  { href: "/playlists", label: "Playlists", icon: "queue_music" },
  { href: "/hors-ligne", label: "Hors ligne", icon: "download_for_offline" },
];

function useActive() {
  const path = usePathname();
  return (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
}

/** Mobile (< 768 px) : barre d'onglets en bas, comme la maquette. */
export function BottomNav() {
  const isActive = useActive();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-sand bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Navigation principale">
      <ul className="flex h-[72px] items-stretch justify-around">
        {NAV.map((n) => {
          const active = isActive(n.href);
          return (
            <li key={n.href} className="flex-1">
              <Link href={n.href} className={`flex h-full flex-col items-center justify-center gap-1 text-[13px] font-bold ${active ? "text-pink" : "text-ink"}`} aria-current={active ? "page" : undefined}>
                <Icon name={n.icon} filled={active} size={26} />
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Tablette (768–1279 px) : rail vertical d'icônes. */
export function NavRail() {
  const isActive = useActive();
  return (
    <nav className="fixed inset-y-0 left-0 z-50 hidden w-[96px] flex-col items-center gap-2 border-r border-sand bg-cream py-6 md:flex lg:hidden" aria-label="Navigation principale">
      <Link href="/" aria-label="Accueil Mkaraks" className="mb-4 grid size-12 place-items-center rounded-[14px] bg-ink">
        <Icon name="mic" filled size={28} className="text-yellow" />
      </Link>
      {NAV.map((n) => {
        const active = isActive(n.href);
        return (
          <Link key={n.href} href={n.href} className="flex w-full flex-col items-center gap-1 py-2 text-xs font-bold" aria-current={active ? "page" : undefined}>
            <span className={`grid h-9 w-14 place-items-center rounded-full ${active ? "bg-pink text-white" : "text-ink"}`}>
              <Icon name={n.icon} filled={active} size={24} />
            </span>
            <span className={active ? "text-pink" : ""}>{n.label}</span>
          </Link>
        );
      })}
      <div className="mt-auto">
        <AccountButton compact />
      </div>
    </nav>
  );
}

/** Desktop (≥ 1280 px) : barre latérale avec playlists. */
export function Sidebar() {
  const isActive = useActive();
  const { playlists } = useLibrary();
  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-[272px] flex-col border-r border-sand bg-cream px-5 py-7 lg:flex" aria-label="Navigation principale">
      <Link href="/" className="mb-8 px-2">
        <Logo size="md" />
      </Link>
      <nav>
        <ul className="space-y-1">
          {NAV.map((n) => {
            const active = isActive(n.href);
            return (
              <li key={n.href}>
                <Link
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-full px-4 py-3 font-bold transition ${active ? "bg-ink text-white" : "hover:bg-sand"}`}
                >
                  <Icon name={n.icon} filled={active} size={24} className={active ? "text-pink" : ""} />
                  {n.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-8 flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex items-center justify-between px-2">
          <p className="font-display text-sm font-bold">Mes playlists</p>
          <Link href="/playlists?nouvelle=1" className="grid size-8 place-items-center rounded-full hover:bg-sand" aria-label="Nouvelle playlist">
            <Icon name="add" size={22} />
          </Link>
        </div>
        <ul className="no-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto">
          {playlists.map((pl) => (
            <li key={pl.id}>
              <Link href={`/playlists/${pl.id}`} className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-sand">
                <span className={`grid size-9 place-items-center rounded-[11px] ${PLAYLIST_BG[pl.color]}`}>
                  <Icon name="queue_music" size={20} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{pl.name}</span>
                  <span className="block text-xs text-muted">{pl.songs.length} titres</span>
                </span>
              </Link>
            </li>
          ))}
          {playlists.length === 0 && <li className="px-2 text-sm text-muted">Aucune playlist pour l’instant.</li>}
        </ul>
      </div>

      <div className="mt-4 border-t border-sand pt-4">
        <AccountButton />
      </div>
    </aside>
  );
}

export function AccountButton({ compact }: { compact?: boolean }) {
  const { user, logout } = useUser();
  if (user === undefined) return <span className="block size-11" />;
  if (!user)
    return (
      <Link href="/connexion" className={compact ? "grid size-11 place-items-center rounded-full border-[1.6px] border-ink" : "btn-outline h-12 w-full text-base"} aria-label="Se connecter">
        {compact ? <Icon name="login" size={22} /> : "Se connecter"}
      </Link>
    );
  const initial = user.name.trim().charAt(0).toUpperCase() || "?";
  return (
    <button onClick={logout} className="flex w-full items-center gap-3 rounded-2xl text-left hover:bg-sand lg:p-2" title="Se déconnecter">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-violet font-display text-lg font-extrabold text-white">{initial}</span>
      {!compact && (
        <span className="min-w-0">
          <span className="block truncate font-bold">{user.name}</span>
          <span className="block text-xs text-muted">Se déconnecter</span>
        </span>
      )}
    </button>
  );
}
