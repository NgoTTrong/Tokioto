"use client";
import type { Track } from "@/types";

export default function TrackCard({ track, onPlay }: { track: Track; onPlay: () => void }) {
  const src = track.thumbnail_url?.startsWith("http")
    ? track.thumbnail_url
    : track.thumbnail_url ? `/api/r2/${track.thumbnail_url}` : null;
  return (
    <button onClick={onPlay} className="flex items-center gap-3 w-full p-2 rounded hover:bg-white/5 text-left">
      <div className="w-12 h-12 rounded bg-white/10 overflow-hidden flex-shrink-0">
        {src && <img src={src} alt="" className="w-full h-full object-cover" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{track.title}</div>
        <div className="text-xs text-white/60 truncate">{track.artist ?? "—"}</div>
      </div>
      {track.status !== "ready" && (
        <span className="text-xs px-2 py-0.5 rounded bg-white/10">{track.status}</span>
      )}
    </button>
  );
}
