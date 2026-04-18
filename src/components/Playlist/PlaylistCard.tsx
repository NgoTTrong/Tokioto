import Link from "next/link";
import PlaylistCollage from "./PlaylistCollage";

export default function PlaylistCard({ id, name, thumbs, smart }: { id: string; name: string; thumbs: (string | null)[]; smart?: boolean }) {
  return (
    <Link href={`/playlists/${encodeURIComponent(id)}`} className="group flex flex-col gap-2">
      <div className="group-hover:scale-[1.02] transition-transform duration-200">
        <PlaylistCollage thumbs={thumbs} />
      </div>
      <div className="text-sm font-medium text-white/85 group-hover:text-white transition-colors truncate">
        {name}
        {smart && <span className="ml-1.5 text-[10px] text-purple-400/70 font-normal">smart</span>}
      </div>
    </Link>
  );
}
