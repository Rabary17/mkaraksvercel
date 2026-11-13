import { BottomNav, NavRail, Sidebar } from "@/components/layout/AppNav";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { GlobalSearch } from "@/components/search/GlobalSearch";

/**
 * Coque de l'application :
 *  - mobile  : contenu + barre d'onglets en bas (maquette)
 *  - tablette: rail d'icônes à gauche (96 px)
 *  - desktop : barre latérale avec playlists (272 px)
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <NavRail />
      <div className="md:pl-[96px] lg:pl-[272px]">
        <OfflineBanner />
        <main className="mx-auto w-full max-w-[1200px] px-5 pt-[calc(20px+env(safe-area-inset-top))] pb-[calc(170px+env(safe-area-inset-bottom))] md:px-8 md:pt-10 md:pb-32 lg:px-12">
          <div className="relative z-40 mb-6 md:mb-8">
            <GlobalSearch />
          </div>
          {children}
        </main>
      </div>
      <BottomNav />
    </>
  );
}
