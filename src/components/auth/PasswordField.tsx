"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

export function PasswordField({
  id,
  autoComplete,
  error,
  minLength,
}: {
  id: string;
  autoComplete: "current-password" | "new-password";
  error?: string | null;
  minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="field-label">
        Mot de passe
      </label>
      <div className="relative">
        <input
          id={id}
          name="password"
          type={show ? "text" : "password"}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          className="field pr-14"
        />
        <button type="button" onClick={() => setShow((s) => !s)} className="absolute top-1/2 right-3 grid size-10 -translate-y-1/2 place-items-center text-muted" aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
          <Icon name={show ? "visibility_off" : "visibility"} />
        </button>
      </div>
      {error && (
        <p id={`${id}-err`} className="mt-2 flex items-center gap-1.5 text-sm font-bold text-pink-deep">
          <Icon name="info" size={18} /> {error}
        </p>
      )}
    </div>
  );
}
