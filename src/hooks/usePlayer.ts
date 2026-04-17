// src/hooks/usePlayer.ts
"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Track } from "@/types";

type PlayerState = {
  queue: Track[];
  index: number;
  isPlaying: boolean;
  loop: boolean;
  currentTime: number;
  duration: number;
};

export function usePlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<PlayerState>({ queue: [], index: 0, isPlaying: false, loop: false, currentTime: 0, duration: 0 });
  const current = state.queue[state.index];

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!audioRef.current) audioRef.current = new Audio();
    const a = audioRef.current;
    const ontime = () => setState(s => ({ ...s, currentTime: a.currentTime, duration: a.duration || 0 }));
    const onend = () => setState(s => ({ ...s, index: Math.min(s.index + 1, s.queue.length - 1), currentTime: 0 }));
    a.addEventListener("timeupdate", ontime);
    a.addEventListener("ended", onend);
    return () => { a.removeEventListener("timeupdate", ontime); a.removeEventListener("ended", onend); };
  }, []);

  useEffect(() => {
    (async () => {
      const a = audioRef.current; if (!a || !current) return;
      try {
        const { getCached } = await import("@/hooks/useOfflineCache");
        const cached = await getCached(current.id);
        a.src = cached ? URL.createObjectURL(await cached.blob()) : `/api/tracks/${current.id}/stream`;
      } catch {
        a.src = `/api/tracks/${current.id}/stream`;
      }
      if (state.isPlaying) a.play().catch(() => {});
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    a.loop = state.loop;
    if (state.isPlaying) a.play().catch(() => {}); else a.pause();
  }, [state.isPlaying, state.loop]);

  const setQueue = useCallback((tracks: Track[], startIndex = 0) => {
    setState(s => ({ ...s, queue: tracks, index: startIndex, isPlaying: true, currentTime: 0 }));
  }, []);
  const play = useCallback(() => setState(s => ({ ...s, isPlaying: true })), []);
  const pause = useCallback(() => setState(s => ({ ...s, isPlaying: false })), []);
  const toggle = useCallback(() => setState(s => ({ ...s, isPlaying: !s.isPlaying })), []);
  const next = useCallback(() => setState(s => s.index < s.queue.length - 1 ? { ...s, index: s.index + 1 } : s), []);
  const prev = useCallback(() => setState(s => s.index > 0 ? { ...s, index: s.index - 1 } : s), []);
  const seek = useCallback((t: number) => { if (audioRef.current) audioRef.current.currentTime = t; }, []);
  const moveTo = useCallback((i: number) => setState(s => ({ ...s, index: i })), []);
  const setLoop = useCallback((v: boolean) => setState(s => ({ ...s, loop: v })), []);

  return useMemo(() => ({ ...state, current, setQueue, play, pause, toggle, next, prev, seek, moveTo, setLoop }), [state, current, setQueue, play, pause, toggle, next, prev, seek, moveTo, setLoop]);
}
