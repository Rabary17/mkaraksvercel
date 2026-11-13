"use client";
import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Icon } from "@/components/ui/Icon";
import { PLAYLIST_COLORS, type PlaylistColor, type PlaylistRec } from "@/lib/client/db";
import { useLibrary } from "@/components/providers/LibraryProvider";
import { PLAYLIST_SWATCH } from "./playlist-colors";

const COLOR_LABEL: Record<PlaylistColor, string> = { yellow: "Jaune", pink: "Rose", teal: "Turquoise", violet: "Violet", orange: "Orange" };

/** Écran 07 « Nouvelle playlist ». */
export function NewPlaylistSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: (p: PlaylistRec) => void }) {
  const lib = useLibrary();
  const [name, setName] = useState("");
  const [color, setColor] = useState<PlaylistColor>("yellow");
  const [offline, setOffline] = useState(true);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const p = await lib.createPlaylist({ name: name.trim(), color, offline });
    if (!p) return;
    setName("");
    onClose();
    onCreated?.(p); // après onClose : la navigation vers la playlist doit être la dernière
  }

  return (
    <Sheet open={open} onClose={onClose} title="Nouvelle playlist">
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label htmlFor="pl-name" className="field-label">
            Nom
          </label>
          <input id="pl-name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Anniversaire de Mama" autoFocus required maxLength={60} />
        </div>

        <fieldset>
          <legend className="field-label">Couleur</legend>
          <div className="flex gap-3">
            {PLAYLIST_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={COLOR_LABEL[c]}
                aria-pressed={color === c}
                className={`size-12 rounded-full ${PLAYLIST_SWATCH[c]} ${color === c ? "ring-[3px] ring-ink ring-offset-[3px] ring-offset-cream" : ""}`}
              />
            ))}
          </div>
        </fieldset>

        <label className="flex cursor-pointer items-center gap-3 font-bold">
          <input type="checkbox" checked={offline} onChange={(e) => setOffline(e.target.checked)} className="peer sr-only" />
          <span className="relative h-7 w-12 shrink-0 rounded-full bg-line transition peer-checked:bg-teal peer-focus-visible:ring-2 peer-focus-visible:ring-ink after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
          Télécharger pour chanter hors ligne
        </label>

        <button className="btn-primary w-full" disabled={!name.trim()}>
          <Icon name="add" /> Créer la playlist
        </button>
      </form>
    </Sheet>
  );
}
