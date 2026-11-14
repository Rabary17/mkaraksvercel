"use client";
import { useEffect, useState, type ReactNode } from "react";
import { getPrefs, setPrefs, type Highlight, type KaraokeBg, type LyricsFont, type LyricsSize, type Prefs, type TitleFont } from "@/lib/client/prefs";

const TITLE_FONTS: { key: TitleFont; label: string; family: string }[] = [
  { key: "unbounded", label: "Unbounded", family: "var(--font-unbounded)" },
  { key: "fraunces", label: "Fraunces", family: "var(--font-fraunces)" },
  { key: "outfit", label: "Outfit", family: "var(--font-outfit)" },
  { key: "inter", label: "Inter", family: "var(--font-inter)" },
];
const LYRICS_FONTS: { key: LyricsFont; label: string; family: string }[] = [
  { key: "figtree", label: "Figtree", family: "var(--font-figtree)" },
  { key: "fraunces", label: "Fraunces", family: "var(--font-fraunces)" },
  { key: "outfit", label: "Outfit", family: "var(--font-outfit)" },
  { key: "inter", label: "Inter", family: "var(--font-inter)" },
];
const SIZES: { key: LyricsSize; label: string }[] = [
  { key: "small", label: "Petite" },
  { key: "normal", label: "Normale" },
  { key: "large", label: "Grande" },
];
const HIGHLIGHTS: { key: Highlight; label: string; swatch: string }[] = [
  { key: "pink", label: "Rose", swatch: "bg-pink" },
  { key: "yellow", label: "Jaune", swatch: "bg-yellow" },
  { key: "teal", label: "Turquoise", swatch: "bg-teal" },
  { key: "white", label: "Blanc", swatch: "bg-white" },
];
const BGS: { key: KaraokeBg; label: string; swatch: string }[] = [
  { key: "violet", label: "Violet", swatch: "bg-ink" },
  { key: "dark", label: "Sombre", swatch: "bg-[#0b0715]" },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-5">
      <h2 className="h-section">{title}</h2>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function Option({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="font-bold">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children, style }: { active: boolean; onClick: () => void; children: ReactNode; style?: React.CSSProperties }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={style}
      className={`chip h-12 px-5 text-base ${active ? "bg-ink text-white" : "border-[1.6px] border-ink bg-white text-ink"}`}
    >
      {children}
    </button>
  );
}

/** Réglages de l'application et du karaoké ; chaque choix est enregistré sur le compte. */
export default function SettingsPage() {
  const [p, setP] = useState<Prefs | null>(null);
  useEffect(() => setP(getPrefs()), []);
  if (!p) return null;

  const update = (patch: Partial<Prefs>) => {
    setPrefs(patch);
    setP({ ...p, ...patch });
  };

  return (
    <div className="space-y-12">
      <h1 className="h-display text-[32px] md:text-5xl">Réglages</h1>

      <Section title="Apparence">
        <Option label="Police des titres">
          {TITLE_FONTS.map((f) => (
            <Chip key={f.key} active={p.titleFont === f.key} onClick={() => update({ titleFont: f.key })} style={{ fontFamily: f.family }}>
              {f.label}
            </Chip>
          ))}
        </Option>
      </Section>

      <Section title="Karaoké">
        <Option label="Police des paroles">
          {LYRICS_FONTS.map((f) => (
            <Chip key={f.key} active={p.lyricsFont === f.key} onClick={() => update({ lyricsFont: f.key })} style={{ fontFamily: f.family }}>
              {f.label}
            </Chip>
          ))}
        </Option>
        <Option label="Taille des paroles">
          {SIZES.map((s) => (
            <Chip key={s.key} active={p.lyricsSize === s.key} onClick={() => update({ lyricsSize: s.key })}>
              {s.label}
            </Chip>
          ))}
        </Option>
        <Option label="Couleur de mise en évidence">
          {HIGHLIGHTS.map((h) => (
            <button
              key={h.key}
              type="button"
              onClick={() => update({ highlight: h.key })}
              aria-label={h.label}
              aria-pressed={p.highlight === h.key}
              className={`size-12 rounded-full ${h.swatch} ${p.highlight === h.key ? "ring-[3px] ring-ink ring-offset-[3px] ring-offset-cream" : ""}`}
            />
          ))}
        </Option>
        <Option label="Fond de l’écran">
          {BGS.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => update({ karaokeBg: b.key })}
              aria-label={b.label}
              aria-pressed={p.karaokeBg === b.key}
              className={`size-12 rounded-full ${b.swatch} ${p.karaokeBg === b.key ? "ring-[3px] ring-ink ring-offset-[3px] ring-offset-cream" : ""}`}
            />
          ))}
        </Option>
        <Option label={`Décalage des paroles : ${p.lyricsDelay.toFixed(1)} s`}>
          <input
            type="range"
            min={0.1}
            max={1.9}
            step={0.1}
            value={p.lyricsDelay}
            onChange={(e) => update({ lyricsDelay: Number(e.target.value) })}
            aria-label="Décalage des paroles"
            className="w-full max-w-md accent-pink"
          />
        </Option>
        <Option label="Accords">
          <Chip active={p.showChords} onClick={() => update({ showChords: !p.showChords })}>
            {p.showChords ? "Affichés" : "Masqués"}
          </Chip>
        </Option>
      </Section>

      <Section title="Hors ligne">
        <Option label="Télécharger en Wi-Fi seulement">
          <Chip active={p.wifiOnly} onClick={() => update({ wifiOnly: true })}>
            Oui
          </Chip>
          <Chip active={!p.wifiOnly} onClick={() => update({ wifiOnly: false })}>
            Non
          </Chip>
        </Option>
      </Section>
    </div>
  );
}
