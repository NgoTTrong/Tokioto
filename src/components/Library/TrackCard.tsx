"use client";
import { Play, ListPlus } from "lucide-react";
import { useState } from "react";
import type { Track } from "@/types";
import AddToPlaylistSheet from "@/components/Playlist/AddToPlaylistSheet";

export default function TrackCard({
  track,
  onPlay,
  showAddToPlaylist = false,
}: {
  track: Track;
  onPlay: () => void;
  showAddToPlaylist?: boolean;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const src = track.thumbnail_url?.startsWith("http")
    ? track.thumbnail_url
    : track.thumbnail_url
    ? `/api/r2/${track.thumbnail_url}`
    : null;

  return (
    <>
      <div className="group flex items-center gap-3 w-full p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] hover:border-purple-500/40 hover:shadow-[0_0_20px_rgba(168,85,247,0.12)] transition-all duration-200">
        {/* Thumbnail — click to play */}
        <button onClick={onPlay} className="relative w-[56px] h-[56px] rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-purple-900/50 to-pink-900/50">
          {src && <img src={src} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />}
          {!src && <div className="absolute inset-0 flex items-center justify-center text-white/20 text-xl">♪</div>}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center">
              <Play size={12} fill="black" className="text-black translate-x-px" />
            </div>
          </div>
        </button>

        {/* Info — click to play */}
        <button onClick={onPlay} className="flex-1 min-w-0 text-left">
          <div className="font-medium text-sm truncate text-white/95 group-hover:text-white transition-colors">{track.title}</div>
          <div className="text-xs text-white/45 truncate mt-0.5">{track.artist ?? "—"}</div>
        </button>

        {track.status !== "ready" && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex-shrink-0">
            {track.status}
          </span>
        )}

        {showAddToPlaylist && track.status === "ready" && (
          <button
            onClick={e => { e.stopPropagation(); setSheetOpen(true); }}
            className="p-1.5 rounded-lg text-white/25 hover:text-purple-400 hover:bg-purple-500/10 transition-all flex-shrink-0 opacity-0 group-hover:opacity-100"
            title="Thêm vào playlist"
          >
            <ListPlus size={16} />
          </button>
        )}
      </div>

      {sheetOpen && (
        <AddToPlaylistSheet trackId={track.id} onClose={() => setSheetOpen(false)} />
      )}
    </>
  );
}
