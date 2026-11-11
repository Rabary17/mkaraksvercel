"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Blobs, Logo } from "@/components/ui/Blobs";
import { useAuth } from "@/hooks/useAuth";

export default function RegisterPage() {
  const router = useRouter();
  const { register, loginWithGoogle, loading, error, user } = useAuth();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  if (user) {
    router.push("/");
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);

    if (password !== password2) {
      setLocalError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (password.length < 6) {
      setLocalError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    await register(email, password, name);
  }

  async function handleGoogleLogin() {
    setLocalError(null);
    await loginWithGoogle();
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Mobile seulement : sur desktop, les formes viennent du layout (auth) */}
      <div className="relative h-40 overflow-hidden md:hidden">
        <Blobs />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-8">
          <Logo />
          <div>
            <h1 className="mb-2 text-2xl font-black">Créer un compte</h1>
            <p className="text-sm text-gray-600">Rejoins Mkaraks pour créer des playlists et garder tes favoris.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="field-label">
                Nom (optionnel)
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                className="field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>
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
            <div>
              <label htmlFor="password" className="field-label">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                className="field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password2" className="field-label">
                Confirmer le mot de passe
              </label>
              <input
                id="password2"
                type="password"
                required
                autoComplete="new-password"
                className="field"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                disabled={loading}
              />
            </div>
            {(error || localError) && (
              <p role="alert" className="rounded-2xl bg-pink/10 px-4 py-3 text-sm font-bold text-pink-deep">
                {error || localError}
              </p>
            )}
            <button disabled={loading} className="btn-primary w-full">
              {loading ? "Inscription…" : "Créer un compte"}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">Ou</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="btn-outline w-full flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? "Inscription…" : "Google"}
          </button>

          <Link href="/connexion" className="btn-outline w-full">
            J&rsquo;ai déjà un compte
          </Link>
        </div>
      </div>
    </div>
  );
}
