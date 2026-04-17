// src/hooks/useMediaSession.ts
"use client";
import { useEffect } from "react";
import type { Track } from "@/types";

type Handlers = { play: () => void; pause: () => void; next: () => void; prev: () => void; seek: (t: number) => void };

export function useMediaSession(current: Track | null | undefined, h: Handlers) {
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator) || !current) return;
    const art = current.thumbnail_url?.startsWith("http") ? current.thumbnail_url : current.thumbnail_url ? `/api/r2/${current.thumbnail_url}` : "";
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: current.title, artist: current.artist ?? "",
      artwork: art ? [{ src: art, sizes: "512x512" }] : [],
    });
    navigator.mediaSession.setActionHandler("play", h.play);
    navigator.mediaSession.setActionHandler("pause", h.pause);
    navigator.mediaSession.setActionHandler("previoustrack", h.prev);
    navigator.mediaSession.setActionHandler("nexttrack", h.next);
    navigator.mediaSession.setActionHandler("seekto", (d) => { if (typeof d.seekTime === "number") h.seek(d.seekTime); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);
}
