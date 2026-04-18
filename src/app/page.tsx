"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import type { Track } from "@/types";
import TrackCard from "@/components/Library/TrackCard";
import logoImg from "@/../public/logo.png";

const POLL_INTERVAL = 10_000;

function TrackSkeleton() {
  return (
    <div className="flex items-center gap-3 w-full p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
      <div className="w-[56px] h-[56px] rounded-xl bg-white/[0.07] animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 rounded-full bg-white/[0.07] animate-pulse w-3/4" />
        <div className="h-3 rounded-full bg-white/[0.05] animate-pulse w-1/2" />
      </div>
    </div>
  );
}

export default function Library() {
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const router = useRouter();

  // Callback ref: measure offsetTop as soon as the list container mounts
  const listNodeRef = useRef<HTMLDivElement | null>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const setListRef = useCallback((node: HTMLDivElement | null) => {
    listNodeRef.current = node;
    if (node) setScrollMargin(node.offsetTop);
  }, []);

  useEffect(() => {
    const load = () => {
      if (document.hidden) return;
      fetch("/api/tracks")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d?.tracks) setTracks(d.tracks); });
    };
    load();
    const id = setInterval(load, POLL_INTERVAL);
    const onVisibility = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: tracks?.length ?? 0,
    estimateSize: () => 92,
    overscan: 8,
    scrollMargin,
  });

  return (
    <main className="p-4 pt-10 pb-24 md:px-8 md:pt-12 md:pb-10 min-h-screen bg-[#09090b] max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoImg.src} alt="" className="w-9 h-9 object-contain" />
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
          Tokioto
        </h1>
      </div>
      <p className="text-white/30 text-xs mb-4">
        {tracks === null ? "Đang tải…" : `${tracks.length} bài hát`}
      </p>

      {tracks === null && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ animationDelay: `${i * 80}ms` }}>
              <TrackSkeleton />
            </div>
          ))}
        </div>
      )}

      {tracks && tracks.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 mt-20 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-900/40 to-pink-900/40 border border-purple-500/20 flex items-center justify-center animate-float">
            <span className="text-4xl">♪</span>
          </div>
          <div>
            <p className="text-white/70 font-medium text-sm">Chưa có bài nào</p>
            <p className="text-white/35 text-xs mt-1">Vào tab Import để thêm nhạc</p>
          </div>
        </div>
      )}

      {tracks && tracks.length > 0 && (
        <div ref={setListRef}>
          <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
            {virtualizer.getVirtualItems().map((item) => (
              <div
                key={item.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${item.start - scrollMargin}px)`,
                  paddingBottom: "12px",
                }}
              >
                <TrackCard
                  track={tracks[item.index]}
                  onPlay={() => router.push(`/player?track=${tracks[item.index].id}`)}
                  showAddToPlaylist
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
