"use client";
import Link from "next/link";
import { useState } from "react";
import { FirebaseError } from "firebase/app";
import { sendPasswordResetEmail } from "firebase/auth";
import { Blobs, Logo } from "@/components/ui/Blobs";
import { auth } from "@/lib/firebase";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : "";
      if (code === "auth/user-not-found") setSent(true);
      else if (code === "auth/invalid-email") setError("Cette adresse e-mail n'est pas valide.");
      else if (code === "auth/too-many-requests") setError("Trop de tentatives. Réessaie dans quelques minutes.");
      else setError("Impossible d'envoyer le lien pour l'instant. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="relative h-40 overflow-hidden md:hidden">
        <Blobs />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-8">
          <Logo />
          <div>
            <h1 className="mb-2 text-2xl font-black">Mot de passe oublié</h1>
            <p className="text-sm text-gray-600">Indique ton e-mail : on t’envoie un lien pour en choisir un nouveau.</p>
          </div>

          {sent ? (
            <p role="status" className="rounded-2xl bg-teal/15 px-4 py-3 text-sm font-bold text-ink">
              Si un compte existe pour cette adresse, un lien vient d’être envoyé. Pense à vérifier tes spams.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="field-label">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              {error && (
                <p role="alert" className="rounded-2xl bg-pink/10 px-4 py-3 text-sm font-bold text-pink-deep">
                  {error}
                </p>
              )}
              <button disabled={loading} className="btn-primary w-full">
                {loading ? "Envoi…" : "Envoyer le lien"}
              </button>
            </form>
          )}

          <Link href="/connexion" className="btn-outline w-full">
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
