import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export const metadata = { title: "Pas de connexion" };

/** Page de secours du service worker quand une page non enregistrée est demandée hors ligne. */
export default function NoConnectionPage() {
  return (
    <div className="mx-auto max-w-md space-y-5 pt-10 text-center">
      <span className="mx-auto grid size-20 place-items-center rounded-full bg-yellow">
        <Icon name="wifi_off" size={40} />
      </span>
      <h1 className="h-display text-3xl">Pas de connexion</h1>
      <p className="text-muted">Cette page n’est pas enregistrée sur ton appareil. Tes titres téléchargés restent disponibles.</p>
      <Link href="/hors-ligne" className="btn-primary">
        Mes téléchargements
      </Link>
    </div>
  );
}
