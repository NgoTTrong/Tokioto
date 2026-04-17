import Link from "next/link";
import PlaylistCollage from "./PlaylistCollage";

export default function PlaylistCard({ id, name, thumbs, smart }: { id: string; name: string; thumbs: (string | null)[]; smart?: boolean }) {
  return (
    <Link href={`/playlists/${encodeURIComponent(id)}`} className="flex flex-col gap-2">
      <PlaylistCollage thumbs={thumbs} />
      <div className="text-sm">{name}{smart && <span className="ml-1 text-white/40 text-xs">smart</span>}</div>
    </Link>
  );
}
