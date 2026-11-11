/**
 * Injecte un bloc schema.org.
 *
 * Le contenu vient de WordPress (titres, noms d'artistes) : il n'est pas maîtrisé.
 * `JSON.stringify` seul ne suffit pas — un titre contenant « </script> » fermerait
 * la balise et ferait passer la suite pour du HTML. On neutralise donc `<`.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
