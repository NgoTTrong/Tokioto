"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Track } from "@/types";
import TrackCard from "@/components/Library/TrackCard";

export default function Library() {
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const router = useRouter();
  useEffect(() => {
    fetch("/api/tracks").then(r => r.json()).then(d => setTracks(d.tracks));
  }, []);
  return (
    <main className="p-4 pt-8">
      <h1 className="text-2xl font-semibold mb-4">Library</h1>
      {tracks === null && <p className="opacity-60">Loading…</p>}
      {tracks && tracks.length === 0 && <p className="opacity-60">Chưa có bài nào. Vào tab Import để thêm.</p>}
      <div className="flex flex-col">
        {tracks?.map(t => (
          <TrackCard key={t.id} track={t} onPlay={() => router.push(`/player?track=${t.id}`)} />
        ))}
      </div>
    </main>
  );
}
