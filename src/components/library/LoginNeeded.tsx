import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export function LoginNeeded({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="card flex flex-col items-center gap-3 p-8 text-center">
      <Icon name={icon} size={40} className="text-pink" />
      <p className="text-muted">{text}</p>
      <Link href="/connexion" className="btn-primary">
        Se connecter
      </Link>
    </div>
  );
}
