"use client";
import type { QueueItem } from "@/components/player/PlayerProvider";

export interface Prefs {
  wifiOnly: boolean;
  showChords: boolean;
}
const PREFS_KEY = "mk:prefs";
const RESUME_KEY = "mk:resume";
const DEFAULTS: Prefs = { wifiOnly: true, showChords: true };

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
export function setPrefs(p: Partial<Prefs>) {
  write(PREFS_KEY, { ...getPrefs(), ...p });
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
