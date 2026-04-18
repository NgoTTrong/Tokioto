"use client";
import { Play } from "lucide-react";
import type { Track } from "@/types";

export default function TrackCard({ track, onPlay }: { track: Track; onPlay: () => void }) {
  const src = track.thumbnail_url?.startsWith("http")
    ? track.thumbnail_url
    : track.thumbnail_url
    ? `/api/r2/${track.thumbnail_url}`
    : null;

  return (
    <button
      onClick={onPlay}
      className="group flex items-center gap-3 w-full p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] hover:border-purple-500/40 hover:shadow-[0_0_20px_rgba(168,85,247,0.12)] transition-all duration-200 text-left"
    >
      <div className="w-[56px] h-[56px] rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-purple-900/50 to-pink-900/50 relative">
        {src && <img src={src} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />}
        {!src && <div className="absolute inset-0 flex items-center justify-center text-white/20 text-xl">♪</div>}
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center">
            <Play size={12} fill="black" className="text-black translate-x-px" />
          </div>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate text-white/95 group-hover:text-white transition-colors">{track.title}</div>
        <div className="text-xs text-white/45 truncate mt-0.5">{track.artist ?? "—"}</div>
      </div>
      {track.status !== "ready" && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex-shrink-0">
          {track.status}
        </span>
      )}
    </button>
  );
}
