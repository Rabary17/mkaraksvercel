import { Suspense } from "react";
import { SearchView } from "@/components/search/SearchView";

export const metadata = { title: "Chercher" };

export default function SearchPage() {
  return (
    <div className="space-y-6 md:space-y-8">
      <h1 className="h-display text-[32px] md:text-5xl">Chercher</h1>
      <Suspense fallback={null}>
        <SearchView />
      </Suspense>
    </div>
  );
}
