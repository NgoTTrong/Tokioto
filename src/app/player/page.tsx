// src/app/player/page.tsx
"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ListMusic } from "lucide-react";
import type { Track } from "@/types";
import Vinyl from "@/components/Player/Vinyl";
import Controls from "@/components/Player/Controls";
import QueuePanel from "@/components/Player/QueuePanel";
import { usePlayer } from "@/hooks/usePlayer";
import { useMediaSession } from "@/hooks/useMediaSession";

function PlayerInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const p = usePlayer();
  const [shuffle, setShuffle] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);

  useEffect(() => {
    const track = sp.get("track");
    const playlist = sp.get("playlist");
    if (!track) return;
    const load = async () => {
      let tracks: Track[] = [];
      let startIndex = 0;
      if (playlist) {
        const d = await fetch(`/api/playlists/${encodeURIComponent(playlist)}`).then(r => r.json());
        tracks = d.tracks as Track[];
        startIndex = Math.max(0, tracks.findIndex(t => t.id === track));
      } else {
        const one = await fetch(`/api/tracks?limit=500`).then(r => r.json());
        tracks = (one.tracks as Track[]);
        startIndex = Math.max(0, tracks.findIndex(t => t.id === track));
      }
      if (shuffle) {
        tracks = shuffleFrom(tracks, startIndex);
        startIndex = 0;
      }
      p.setQueue(tracks, startIndex, playlist ?? null);
      fetch(`/api/tracks/${track}/play`, { method: "POST" }).catch(() => {});
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.toString()]);

  useMediaSession(p.current, { play: p.play, pause: p.pause, next: p.next, prev: p.prev, seek: p.seek });

  const bg = p.current?.thumbnail_url
    ? p.current.thumbnail_url.startsWith("http") ? p.current.thumbnail_url : `/api/r2/${p.current.thumbnail_url}`
    : null;

  const rawAccent = p.current?.accent_color;
  const accent = (() => {
    if (!rawAccent || !rawAccent.startsWith("#") || rawAccent.length < 7) return "#a855f7";
    const r = parseInt(rawAccent.slice(1,3), 16);
    const g = parseInt(rawAccent.slice(3,5), 16);
    const b = parseInt(rawAccent.slice(5,7), 16);
    return (0.2126*r + 0.7152*g + 0.0722*b) / 255 > 0.12 ? rawAccent : "#a855f7";
  })();

  return (
    <main className="fixed inset-0 md:left-[220px] md:bottom-[80px] overflow-hidden text-white page-slide-up z-30">
      {/* Background */}
      {bg
        ? <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover scale-110 blur-sm" />
        : <div className="absolute inset-0 bg-[#09090b]" />
      }
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/85" />

      {/* Vinyl / skeleton */}
      <div
        className="absolute inset-0 transition-all duration-700"
        style={p.current && p.isPlaying ? { filter: "drop-shadow(0 0 40px rgba(168,85,247,0.35))" } : undefined}
      >
        {p.current
          ? <Vinyl src={bg} playing={p.isPlaying} />
          : <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] w-[70%] aspect-square rounded-full bg-white/[0.05] animate-pulse" />
        }
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center px-4 pt-4 pb-3 z-10">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white hover:bg-white/20 transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <p className="text-[10px] tracking-[3px] uppercase font-medium text-white/60">Đang phát</p>
        <button
          onClick={() => setQueueOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white hover:bg-white/20 transition-all"
        >
          <ListMusic size={17} />
        </button>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 px-5 pb-10 z-10 md:max-w-lg md:mx-auto md:left-0 md:right-0">
        <div className="text-center mb-4">
          {p.current ? (
            <>
              <h2 className="text-[18px] font-semibold drop-shadow-lg leading-snug">{p.current.title}</h2>
              <p className="text-sm opacity-70 drop-shadow mt-0.5">{p.current.artist ?? "—"}</p>
            </>
          ) : (
            <>
              <div className="h-5 w-44 rounded-full bg-white/[0.08] animate-pulse mx-auto" />
              <div className="h-3 w-28 rounded-full bg-white/[0.05] animate-pulse mx-auto mt-2" />
            </>
          )}
        </div>
        {p.current && (
          <Controls
            isPlaying={p.isPlaying} currentTime={p.currentTime} duration={p.duration}
            onPlayPause={p.toggle} onNext={p.next} onPrev={p.prev} onSeek={p.seek}
            accent={accent}
            shuffle={shuffle} onShuffle={() => setShuffle(v => !v)}
            loop={p.loop} onLoop={() => p.setLoop(!p.loop)}
            canPrev={p.index > 0} canNext={p.index < p.queue.length - 1}
          />
        )}
      </div>

      {p.current && (
        <QueuePanel queue={p.queue} index={p.index} onPick={p.moveTo} open={queueOpen} onClose={() => setQueueOpen(false)} />
      )}
    </main>
  );
}

function shuffleFrom<T>(arr: T[], keep: number): T[] {
  const pinned = arr[keep];
  const rest = arr.filter((_, i) => i !== keep);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [pinned, ...rest];
}

export default function Player() {
  return (
    <Suspense fallback={<main className="p-4 text-white">Loading…</main>}>
      <PlayerInner />
    </Suspense>
  );
}
