"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Blobs, Logo } from "@/components/ui/Blobs";
import { PasswordField } from "@/components/auth/PasswordField";
import { useUser } from "@/components/providers/UserProvider";

const LOST_PASSWORD_URL = process.env.NEXT_PUBLIC_LOST_PASSWORD_URL || "/mot-de-passe-oublie";

/** Écran 01 « Connexion ». */
export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.get("email"), password: form.get("password") }),
      });
      if (!res.ok) {
        setError((await res.json().catch(() => null))?.error ?? "Connexion impossible.");
        return;
      }
      await refresh();
      router.push("/");
      router.refresh();
    } catch {
      setError("Pas de connexion internet.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col md:min-h-0">
      {/* Formes colorées : mobile uniquement (desktop : panneau de gauche) */}
      <div className="relative h-[34dvh] min-h-52 md:hidden">
        <Blobs />
      </div>

      <div className="relative -mt-10 flex-1 rounded-t-[36px] bg-cream px-7 pt-8 pb-[calc(28px+env(safe-area-inset-bottom))] md:mt-0 md:flex-none md:rounded-[36px] md:p-10 md:shadow-xl">
        <Logo />
        <p className="mt-4 mb-7 text-lg leading-snug text-muted">Chante tes chansons préférées, même sans connexion.</p>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="field-label">
              E-mail
            </label>
            <input id="email" name="email" type="text" inputMode="email" required autoComplete="username" className="field" />
          </div>
          <PasswordField id="password" autoComplete="current-password" />
          <div className="text-right">
            <a href={LOST_PASSWORD_URL} className="text-[15px] font-bold text-pink">
              Mot de passe oublié ?
            </a>
          </div>
          {error && (
            <p role="alert" className="rounded-2xl bg-pink/10 px-4 py-3 text-sm font-bold text-pink-deep">
              {error}
            </p>
          )}
          <button disabled={busy} className="btn-primary w-full">
            {busy ? "Connexion…" : "Se connecter"}
          </button>
          <Link href="/inscription" className="btn-outline w-full">
            Créer un compte
          </Link>
        </form>
      </div>
    </div>
  );
}
