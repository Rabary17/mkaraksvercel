"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { PasswordField } from "@/components/auth/PasswordField";
import { useUser } from "@/components/providers/UserProvider";

const TERMS_URL = process.env.NEXT_PUBLIC_TERMS_URL || "/conditions-utilisation";

/** Écran 02 « Création de compte ». */
export default function SignupPage() {
  const router = useRouter();
  const { refresh } = useUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password.length < 8) {
      setPwError("8 caractères minimum");
      return;
    }
    setPwError(null);
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.get("name"), email: form.get("email"), password }),
      });
      if (!res.ok) {
        setError((await res.json().catch(() => null))?.error ?? "Inscription impossible.");
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
    <div className="flex min-h-dvh flex-col bg-cream px-7 pt-[calc(24px+env(safe-area-inset-top))] pb-[calc(28px+env(safe-area-inset-bottom))] md:min-h-0 md:rounded-[36px] md:p-10 md:shadow-xl">
      <Link href="/connexion" className="icon-btn" aria-label="Retour à la connexion">
        <Icon name="arrow_back" />
      </Link>
      <h1 className="h-display mt-6 text-[32px]">Crée ton compte</h1>
      <p className="mt-3 mb-6 text-lg leading-snug text-muted">Il te sert à garder tes favoris, tes playlists et tes téléchargements sur tous tes appareils.</p>

      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-5">
        <div>
          <label htmlFor="name" className="field-label">
            Pseudo
          </label>
          <input id="name" name="name" required maxLength={40} autoComplete="nickname" className="field" />
        </div>
        <div>
          <label htmlFor="email" className="field-label">
            E-mail
          </label>
          <input id="email" name="email" type="email" required autoComplete="email" className="field" />
        </div>
        <PasswordField id="password" autoComplete="new-password" error={pwError} />

        <label className="flex cursor-pointer items-start gap-3 text-[15px]">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} required className="peer sr-only" />
          <span className="grid size-7 shrink-0 place-items-center rounded-lg border-[1.6px] border-ink text-white peer-checked:border-teal peer-checked:bg-teal peer-focus-visible:ring-2 peer-focus-visible:ring-ink">
            {accepted && <Icon name="check" size={20} />}
          </span>
          <span className="pt-0.5">
            J’accepte les{" "}
            <a href={TERMS_URL} target="_blank" rel="noreferrer" className="font-bold text-pink">
              conditions d’utilisation
            </a>
          </span>
        </label>

        {error && (
          <p role="alert" className="rounded-2xl bg-pink/10 px-4 py-3 text-sm font-bold text-pink-deep">
            {error}
          </p>
        )}

        <div className="mt-auto space-y-4 pt-4">
          <button disabled={busy || !accepted} className="btn-primary w-full">
            {busy ? "Création…" : "Créer mon compte"}
          </button>
          <p className="text-center text-[15px]">
            Déjà inscrit ?{" "}
            <Link href="/connexion" className="font-bold text-pink">
              Se connecter
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
