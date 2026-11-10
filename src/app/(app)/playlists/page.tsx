import { Suspense } from "react";
import { PlaylistsView } from "./PlaylistsView";

export const metadata = { title: "Playlists" };

export default function PlaylistsPage() {
  return (
    <Suspense>
      <PlaylistsView />
    </Suspense>
  );
}
