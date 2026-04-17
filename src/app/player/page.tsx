// src/app/player/page.tsx
"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
      p.setQueue(tracks, startIndex);
      fetch(`/api/tracks/${track}/play`, { method: "POST" }).catch(() => {});
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.toString()]);

  useMediaSession(p.current, { play: p.play, pause: p.pause, next: p.next, prev: p.prev, seek: p.seek });

  const bg = p.current?.thumbnail_url
    ? p.current.thumbnail_url.startsWith("http") ? p.current.thumbnail_url : `/api/r2/${p.current.thumbnail_url}`
    : null;

  if (!p.current) return <main className="p-4 text-white">Không có bài nào để phát.</main>;

  return (
    <main className="fixed inset-0 overflow-hidden text-white">
      {bg && <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/75" />

      <Vinyl src={bg} playing={p.isPlaying} />

      <div className="absolute top-0 left-0 right-0 flex justify-between items-center px-4 py-3 z-10">
        <button onClick={() => router.back()}>◁</button>
        <span className="text-[10px] tracking-[2px] opacity-80">ĐANG PHÁT</span>
        <button>⋯</button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 z-10">
        <div className="text-center mb-3">
          <h2 className="text-[17px] font-semibold drop-shadow">{p.current.title}</h2>
          <p className="text-xs opacity-85 drop-shadow">{p.current.artist ?? "—"}</p>
        </div>
        <Controls
          isPlaying={p.isPlaying} currentTime={p.currentTime} duration={p.duration}
          onPlayPause={p.toggle} onNext={p.next} onPrev={p.prev} onSeek={p.seek}
          accent={p.current.accent_color}
          shuffle={shuffle} onShuffle={() => setShuffle(v => !v)}
          loop={p.loop} onLoop={() => p.setLoop(!p.loop)}
        />
      </div>

      <QueuePanel queue={p.queue} index={p.index} onPick={p.moveTo} />
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
