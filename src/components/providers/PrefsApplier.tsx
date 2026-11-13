"use client";
import { useEffect } from "react";
import { getPrefs, PREFS_EVENT } from "@/lib/client/prefs";

/** Reporte les préférences d'apparence sur <html> : les styles CSS s'y adaptent immédiatement. */
export function PrefsApplier() {
  useEffect(() => {
    const apply = () => {
      const p = getPrefs();
      const d = document.documentElement.dataset;
      d.titleFont = p.titleFont;
      d.lyricsFont = p.lyricsFont;
      d.lyricsSize = p.lyricsSize;
      d.highlight = p.highlight;
      d.karaokeBg = p.karaokeBg;
    };
    apply();
    window.addEventListener(PREFS_EVENT, apply);
    return () => window.removeEventListener(PREFS_EVENT, apply);
  }, []);
  return null;
}
