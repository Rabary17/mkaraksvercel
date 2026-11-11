"use client";

import { useEffect, useState, useCallback } from "react";
import { FirebaseError } from "firebase/app";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(false);
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        try {
          await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });
          setUser(firebaseUser);
        } catch (err) {
          console.error("Failed to create session:", err);
          setError("Erreur lors de la connexion.");
        }
      } else {
        setUser(null);
      }
    });

    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      const firebaseErr = err as FirebaseError;
      const errorMsg =
        firebaseErr.code === "auth/user-not-found"
          ? "Utilisateur non trouvé."
          : firebaseErr.code === "auth/wrong-password" || firebaseErr.code === "auth/invalid-credential"
          ? "Mot de passe incorrect."
          : firebaseErr.message || "Erreur lors de la connexion.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    setError(null);
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) {
        await updateProfile(cred.user, { displayName: name });
      }
    } catch (err) {
      const firebaseErr = err as FirebaseError;
      const errorMsg =
        firebaseErr.code === "auth/email-already-in-use"
          ? "Cet email existe déjà."
          : firebaseErr.code === "auth/weak-password"
          ? "Le mot de passe est trop faible."
          : firebaseErr.message || "Erreur lors de l'inscription.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      const firebaseErr = err as FirebaseError;
      setError(firebaseErr.message || "Erreur lors de la connexion Google.");
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await signOut(auth);
      setUser(null);
    } catch {
      setError("Erreur lors de la déconnexion.");
    }
  }, []);

  return { user, loading, error, login, register, loginWithGoogle, logout };
}
