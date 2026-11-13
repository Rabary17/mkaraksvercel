/** Égaliseur animé : le signal du chant pendant un chargement. */
export function Loader({ label = "Chargement…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-4 py-16 text-muted">
      <div className="flex h-12 items-end gap-1.5" aria-hidden>
        {["bg-yellow", "bg-pink", "bg-teal", "bg-lilac", "bg-orange"].map((color, i) => (
          <span key={color} className={`mk-eq-bar w-2 rounded-full ${color}`} style={{ animationDelay: `${i * 120}ms` }} />
        ))}
      </div>
      <span className="text-sm font-bold">{label}</span>
    </div>
  );
}
