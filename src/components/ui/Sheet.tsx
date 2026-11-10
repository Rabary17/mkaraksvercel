"use client";
import { useEffect } from "react";

/**
 * Feuille modale : glisse du bas sur mobile (comme la maquette),
 * devient une fenêtre centrée sur tablette et desktop.
 */
export function Sheet({
  open,
  onClose,
  title,
  action,
  children,
  dark,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  dark?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal aria-label={title}>
      <button aria-label="Fermer" onClick={onClose} className={`absolute inset-0 ${dark ? "bg-ink/40" : "bg-ink/55"}`} />
      <div className="relative w-full max-w-lg rounded-t-[34px] bg-cream px-6 pt-3.5 pb-[calc(30px+env(safe-area-inset-bottom))] text-ink shadow-2xl md:rounded-[34px] md:px-8 md:pt-8 md:pb-8">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line md:hidden" />
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl font-extrabold">{title}</h2>
          {action}
        </div>
        {children}
      </div>
    </div>
  );
}
