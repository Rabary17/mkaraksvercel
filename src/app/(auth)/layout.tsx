import { Blobs, Logo } from "@/components/ui/Blobs";

/**
 * Écrans 01/02. Mobile : formes colorées en haut + carte crème (maquette).
 * Tablette/desktop : écran partagé, formes à gauche, formulaire à droite.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-cream md:block">
        <Blobs />
        <div className="absolute inset-x-10 bottom-10 rounded-[32px] bg-ink p-8 text-white lg:inset-x-16 lg:bottom-16 lg:p-10">
          <Logo size="lg" onDark />
          <p className="mt-4 font-display text-2xl leading-snug font-bold lg:text-3xl">
            Chante tes chansons préférées, <span className="text-yellow">même sans connexion.</span>
          </p>
          <p className="mt-3 text-white/70">Plus de 14 000 karaokés malagasy, paroles synchronisées et accords.</p>
        </div>
      </div>
      <div className="flex min-h-dvh items-stretch justify-center md:items-center md:bg-sand/50 md:p-10">
        <div className="w-full md:max-w-[480px]">{children}</div>
      </div>
    </div>
  );
}
