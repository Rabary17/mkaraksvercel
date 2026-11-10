import Link from "next/link";
import { Icon } from "./Icon";

export function Pager({ current, pages, href }: { current: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav className="flex items-center justify-center gap-3 pt-2" aria-label="Pagination">
      {current > 1 ? (
        <Link href={href(current - 1)} className="icon-btn" aria-label="Page précédente">
          <Icon name="arrow_back" />
        </Link>
      ) : (
        <span className="icon-btn opacity-25">
          <Icon name="arrow_back" />
        </span>
      )}
      <span className="min-w-28 text-center font-bold">
        {current} / {pages}
      </span>
      {current < pages ? (
        <Link href={href(current + 1)} className="icon-btn" aria-label="Page suivante">
          <Icon name="arrow_forward" />
        </Link>
      ) : (
        <span className="icon-btn opacity-25">
          <Icon name="arrow_forward" />
        </span>
      )}
    </nav>
  );
}
