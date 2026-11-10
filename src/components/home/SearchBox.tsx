import { Icon } from "@/components/ui/Icon";

/** Champ de recherche arrondi (écran 03). Formulaire GET : fonctionne sans JavaScript. */
export function SearchBox({ defaultValue, autoFocus }: { defaultValue?: string; autoFocus?: boolean }) {
  return (
    <form action="/recherche" role="search" className="relative">
      <Icon name="search" size={24} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2" />
      <input
        name="q"
        type="search"
        defaultValue={defaultValue}
        autoFocus={autoFocus}
        placeholder="Titre ou artiste…"
        aria-label="Rechercher un titre ou un artiste"
        className="field h-14 rounded-full pl-12 md:h-[60px]"
      />
    </form>
  );
}
