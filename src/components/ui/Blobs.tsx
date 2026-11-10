/** Formes colorées de l'écran de connexion de la maquette. */
export function Blobs({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div className="absolute -top-[18%] -left-[22%] aspect-square w-[78%] rounded-full bg-yellow" />
      <div className="absolute top-[12%] -right-[16%] aspect-square w-[62%] rounded-full bg-pink" />
      <div className="absolute top-[38%] left-[34%] aspect-square w-[32%] rounded-full bg-teal" />
    </div>
  );
}

export function Logo({ size = "md", onDark }: { size?: "sm" | "md" | "lg"; onDark?: boolean }) {
  const box = { sm: "size-9 rounded-[11px]", md: "size-12 rounded-[14px]", lg: "size-14 rounded-[16px]" }[size];
  const text = { sm: "text-xl", md: "text-[28px]", lg: "text-4xl" }[size];
  return (
    <span className="inline-flex items-center gap-3">
      <span className={`grid place-items-center bg-ink ${box} ${onDark ? "ring-2 ring-white/20" : ""}`}>
        <span className="material-symbols-rounded filled text-yellow" style={{ fontSize: size === "sm" ? 20 : 28 }}>
          mic
        </span>
      </span>
      <span className={`font-display font-extrabold tracking-tight ${text} ${onDark ? "text-white" : "text-ink"}`}>Mkaraks</span>
    </span>
  );
}
