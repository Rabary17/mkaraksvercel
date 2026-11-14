"use client";
import { usePathname } from "next/navigation";
import { useUser } from "@/components/providers/UserProvider";

/** Hors connexion, toutes les pages sont grisées et inaccessibles, sauf la page « Hors ligne ». */
export function OfflineOverlay() {
  const { online } = useUser();
  const path = usePathname();
  if (online || path.startsWith("/hors-ligne")) return null;
  return <div aria-hidden className="pointer-events-auto fixed inset-0 z-30 bg-cream/70 backdrop-saturate-50" />;
}
