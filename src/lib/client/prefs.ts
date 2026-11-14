"use client";
import type { QueueItem } from "@/components/player/PlayerProvider";

export type TitleFont = "unbounded" | "fraunces" | "outfit" | "inter";
export type LyricsFont = "figtree" | "fraunces" | "outfit" | "inter";
export type LyricsSize = "small" | "normal" | "large";
export type Highlight = "pink" | "yellow" | "teal" | "white";
export type KaraokeBg = "violet" | "dark";

export interface Prefs {
  wifiOnly: boolean;
  showChords: boolean;
  lyricsDelay: number; // secondes de retard du surlignage des paroles
  titleFont: TitleFont;
  lyricsFont: LyricsFont;
  lyricsSize: LyricsSize;
  highlight: Highlight;
  karaokeBg: KaraokeBg;
}
export const PREFS_EVENT = "mk:prefs";
const PREFS_KEY = "mk:prefs";
const RESUME_KEY = "mk:resume";
const DEFAULTS: Prefs = {
  wifiOnly: true,
  showChords: true,
  lyricsDelay: 0.1,
  titleFont: "unbounded",
  lyricsFont: "figtree",
  lyricsSize: "normal",
  highlight: "pink",
  karaokeBg: "violet",
};

function read<T>(key: string): T | null {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* stockage indisponible : on ignore */
  }
}

export function getPrefs(): Prefs {
  return { ...DEFAULTS, ...(read<Partial<Prefs>>(PREFS_KEY) ?? {}) };
}
const PREFS_HEADERS = { "Content-Type": "application/json" };

export function setPrefs(p: Partial<Prefs>) {
  const next = { ...getPrefs(), ...p };
  write(PREFS_KEY, next);
  window.dispatchEvent(new Event(PREFS_EVENT));
  void fetch("/api/preferences", { method: "PUT", headers: PREFS_HEADERS, body: JSON.stringify(next) }).catch(() => {});
}

/** Au login : les préférences du compte remplacent celles de l'appareil ; s'il n'en a pas, on envoie les locales. */
export async function syncPrefs() {
  try {
    const res = await fetch("/api/preferences", { cache: "no-store" });
    if (!res.ok) return;
    const { prefs } = (await res.json()) as { prefs: Partial<Prefs> | null };
    if (prefs) {
      write(PREFS_KEY, { ...DEFAULTS, ...prefs });
      window.dispatchEvent(new Event(PREFS_EVENT));
    } else {
      await fetch("/api/preferences", { method: "PUT", headers: PREFS_HEADERS, body: JSON.stringify(getPrefs()) });
    }
  } catch {}
}

/** Carte « Reprendre » de l'accueil. */
export interface ResumeState {
  item: QueueItem;
  time: number;
  duration: number;
}
export function getResume() {
  return read<ResumeState>(RESUME_KEY);
}
export function setResume(r: ResumeState) {
  write(RESUME_KEY, r);
}
