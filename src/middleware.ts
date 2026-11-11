import { NextResponse, type NextRequest } from "next/server";

/**
 * Empêche l'indexation de tout déploiement servi ailleurs que sur le domaine
 * canonique — aujourd'hui mkaraksvercel.vercel.app, demain les previews.
 *
 * Sans ce garde, Google indexe le domaine temporaire ; après la bascule vers
 * mkaraks.com, les mêmes pages existent sous deux adresses et il faut désindexer
 * l'ancienne à la main, ce qui prend des semaines.
 *
 * Le test porte sur l'hôte réellement servi, pas sur une variable : le jour où
 * mkaraks.com pointera sur Vercel, l'indexation s'ouvrira d'elle-même. Rien à
 * penser à changer au pire moment.
 *
 * Ce middleware ne protège rien : il pose un en-tête consultatif. Toute règle
 * d'accès doit rester dans les routes concernées.

 * L'hote canonique est recalcule ici plutot qu'importe de lib/seo : ce module
 * tire lib/wp puis lib/env, du code Node (Buffer) que le runtime Edge du
 * middleware ne sait pas charger.
 */
const HOTE_CANONIQUE = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://mkaraks.com").host.toLowerCase();

export function middleware(request: NextRequest) {
  const reponse = NextResponse.next();
  const hote = request.headers.get("host")?.toLowerCase() ?? "";
  if (hote !== HOTE_CANONIQUE) {
    reponse.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return reponse;
}

export const config = {
  // Le matcher doit rester une constante littérale : Next l'analyse à la compilation.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js).*)"],
};
