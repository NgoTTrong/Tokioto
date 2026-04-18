"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import type { Track } from "@/types";

type PlayerState = {
  queue: Track[];
  index: number;
  isPlaying: boolean;
  loop: boolean;
  currentTime: number;
  duration: number;
  playlistId: string | null;
};

type PlayerCtx = PlayerState & {
  current: Track | undefined;
  setQueue: (tracks: Track[], startIndex?: number, playlistId?: string | null) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (t: number) => void;
  moveTo: (i: number) => void;
  setLoop: (v: boolean) => void;
};

const Ctx = createContext<PlayerCtx | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<PlayerState>({
    queue: [], index: 0, isPlaying: false, loop: false, currentTime: 0, duration: 0, playlistId: null,
  });
  const current = state.queue[state.index];

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!audioRef.current) audioRef.current = new Audio();
    const a = audioRef.current;
    const ontime = () => setState(s => ({ ...s, currentTime: a.currentTime, duration: a.duration || 0 }));
    const onend = () => setState(s => {
      if (s.index >= s.queue.length - 1) return { ...s, isPlaying: false };
      return { ...s, index: s.index + 1, currentTime: 0 };
    });
    // Sync when browser pauses externally (phone call, lock screen, etc.)
    const onpause = () => { if (!a.ended) setState(s => s.isPlaying ? { ...s, isPlaying: false } : s); };
    const onplay  = () => setState(s => s.isPlaying ? s : { ...s, isPlaying: true });
    a.addEventListener("timeupdate", ontime);
    a.addEventListener("ended", onend);
    a.addEventListener("pause", onpause);
    a.addEventListener("play", onplay);
    return () => {
      a.removeEventListener("timeupdate", ontime);
      a.removeEventListener("ended", onend);
      a.removeEventListener("pause", onpause);
      a.removeEventListener("play", onplay);
    };
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
      if (state.isPlaying) a.play().catch(() => setState(s => ({ ...s, isPlaying: false })));
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    a.loop = state.loop;
    if (state.isPlaying) {
      if (a.src) a.play().catch(() => setState(s => ({ ...s, isPlaying: false })));
    } else a.pause();
  }, [state.isPlaying, state.loop]);

  const setQueue = useCallback((tracks: Track[], startIndex = 0, playlistId: string | null = null) => {
    setState(s => ({ ...s, queue: tracks, index: startIndex, isPlaying: true, currentTime: 0, playlistId }));
  }, []);
  const play = useCallback(() => setState(s => ({ ...s, isPlaying: true })), []);
  const pause = useCallback(() => setState(s => ({ ...s, isPlaying: false })), []);
  const toggle = useCallback(() => setState(s => ({ ...s, isPlaying: !s.isPlaying })), []);
  const next = useCallback(() => setState(s => s.index < s.queue.length - 1 ? { ...s, index: s.index + 1 } : s), []);
  const prev = useCallback(() => setState(s => s.index > 0 ? { ...s, index: s.index - 1 } : s), []);
  const seek = useCallback((t: number) => { if (audioRef.current) audioRef.current.currentTime = t; }, []);
  const moveTo = useCallback((i: number) => setState(s => ({ ...s, index: i })), []);
  const setLoop = useCallback((v: boolean) => setState(s => ({ ...s, loop: v })), []);

  const value = useMemo(() => ({
    ...state, current, setQueue, play, pause, toggle, next, prev, seek, moveTo, setLoop,
  }), [state, current, setQueue, play, pause, toggle, next, prev, seek, moveTo, setLoop]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayer() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePlayer must be used inside PlayerProvider");
  return ctx;
}
