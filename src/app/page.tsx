"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Track } from "@/types";
import TrackCard from "@/components/Library/TrackCard";
import logoImg from "@/../public/logo.png";

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

  useEffect(() => {
    const load = () =>
      fetch("/api/tracks")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d?.tracks) setTracks(d.tracks); });
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="p-4 pt-10 pb-24 md:px-8 md:pt-12 md:pb-10 min-h-screen bg-[#09090b] max-w-4xl">
      <div className="flex items-center gap-3 mb-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoImg.src} alt="" className="w-9 h-9 object-contain md:hidden" />
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
          Tokioto
        </h1>
      </div>
      <p className="text-white/30 text-xs mb-7">
        {tracks === null ? "Đang tải…" : `${tracks.length} bài hát`}
      </p>

      {/* Skeleton while loading */}
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

      <div className="flex flex-col gap-2">
        {tracks?.map((t, i) => (
          <div key={t.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
            <TrackCard track={t} onPlay={() => router.push(`/player?track=${t.id}`)} showAddToPlaylist />
          </div>
        ))}
      </div>
    </main>
  );
}
