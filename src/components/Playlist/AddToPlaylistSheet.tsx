"use client";
import { useEffect, useRef, useState } from "react";
import { X, Check, ListPlus, Loader2 } from "lucide-react";

type Playlist = { id: string; name: string };

type Props = { trackId: string; onClose: () => void };

export default function AddToPlaylistSheet({ trackId, onClose }: Props) {
  const [playlists, setPlaylists] = useState<Playlist[] | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/playlists").then(r => r.json()).then(d => {
      setPlaylists((d.playlists ?? []).filter((p: Playlist) => !p.id.startsWith("smart:")));
    });
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const add = async (playlistId: string) => {
    setAdding(playlistId);
    await fetch(`/api/playlists/${encodeURIComponent(playlistId)}/tracks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ track_id: trackId }),
    });
    setAdding(null);
    setDone(prev => new Set(prev).add(playlistId));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={ref}
        className="relative w-full max-w-sm mx-4 mb-4 md:mb-0 bg-[#18181b] border border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl animate-sheet-up"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
          <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
            <ListPlus size={15} className="text-purple-400" />
            Thêm vào playlist
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {playlists === null ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={18} className="animate-spin text-purple-400" />
            </div>
          ) : playlists.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">Chưa có playlist nào</p>
          ) : (
            playlists.map(pl => (
              <button
                key={pl.id}
                onClick={() => !done.has(pl.id) && add(pl.id)}
                className={`w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.05] transition-colors text-left ${done.has(pl.id) ? "opacity-60" : ""}`}
              >
                <span className="text-sm text-white/85 truncate">{pl.name}</span>
                {adding === pl.id ? (
                  <Loader2 size={14} className="animate-spin text-purple-400 flex-shrink-0" />
                ) : done.has(pl.id) ? (
                  <Check size={14} className="text-green-400 flex-shrink-0" />
                ) : null}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
