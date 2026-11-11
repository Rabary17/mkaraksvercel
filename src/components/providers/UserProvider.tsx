"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/types";
import { clearAllDownloads } from "@/lib/client/offline";

interface UserCtx {
  user: SessionUser | null | undefined; // undefined = en cours de chargement
  online: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}
const Ctx = createContext<UserCtx | null>(null);

export function useUser() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useUser hors de <UserProvider>");
  return c;
}

const CACHED_USER = "mk:user";
/** Émis après un login ou un logout Firebase : l'état de session est relu. */
export const SESSION_EVENT = "mk:session";

export function UserProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const [online, setOnline] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const d = (await (await fetch("/api/auth/me", { cache: "no-store" })).json()) as { user: SessionUser | null };
      setUser(d.user);
      try {
        if (d.user) localStorage.setItem(CACHED_USER, JSON.stringify(d.user));
        else localStorage.removeItem(CACHED_USER);
      } catch {}
    } catch {
      // Hors ligne : on garde le dernier utilisateur connu pour afficher son prénom.
      try {
        const c = localStorage.getItem(CACHED_USER);
        setUser(c ? (JSON.parse(c) as SessionUser) : null);
      } catch {
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    const onSession = () => void refresh();
    window.addEventListener(SESSION_EVENT, onSession);
    return () => window.removeEventListener(SESSION_EVENT, onSession);
  }, [refresh]);

  useEffect(() => {
    void refresh();
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [refresh]);

  const logout = useCallback(async () => {
    if (!confirm("Te déconnecter retire les chansons téléchargées de cet appareil. Tes favoris et playlists restent dans ton compte. Continuer ?")) return;
    await fetch("/api/auth/logout", { method: "POST" });
    const [{ signOut }, { auth }] = await Promise.all([import("firebase/auth"), import("@/lib/firebase")]);
    await signOut(auth).catch(() => {});
    await clearAllDownloads();
    try {
      localStorage.removeItem(CACHED_USER);
    } catch {}
    setUser(null);
    router.push("/connexion");
    router.refresh();
  }, [router]);

  return <Ctx.Provider value={{ user, online, refresh, logout }}>{children}</Ctx.Provider>;
}
