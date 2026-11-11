import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: number;
}

export async function registerUser(email: string, password: string, name?: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const user: User = {
    id: cred.user.uid,
    email: cred.user.email || email,
    name,
    createdAt: Date.now(),
  };
  await setDoc(doc(db, "users", cred.user.uid), user);
  return user;
}

export async function loginUser(email: string, password: string): Promise<User | null> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const snap = await getDoc(doc(db, "users", cred.user.uid));
  return (snap.data() as User) || null;
}

export async function getUserById(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return (snap.data() as User) || null;
}

export async function logoutUser() {
  await signOut(auth);
}
