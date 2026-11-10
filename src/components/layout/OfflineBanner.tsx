"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/components/providers/UserProvider";
import { Icon } from "@/components/ui/Icon";

export function OfflineBanner() {
  const { online } = useUser();
  const path = usePathname();
  if (online || path.startsWith("/hors-ligne")) return null;
  return (
    <Link href="/hors-ligne" className="flex items-center justify-center gap-2 bg-yellow px-4 py-2 text-sm font-bold text-ink">
      <Icon name="wifi_off" size={18} /> Pas de connexion · tes titres téléchargés restent disponibles
    </Link>
  );
}
