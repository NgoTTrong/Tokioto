"use client";
import { useRef, useState, useCallback } from "react";
import { Shuffle, SkipBack, SkipForward, Repeat, Play, Pause } from "lucide-react";

type Props = {
  isPlaying: boolean; currentTime: number; duration: number;
  onPlayPause: () => void; onNext: () => void; onPrev: () => void;
  onSeek: (t: number) => void; accent?: string | null;
  shuffle: boolean; onShuffle: () => void; loop: boolean; onLoop: () => void;
  canPrev?: boolean; canNext?: boolean;
};

function fmt(t: number) {
  if (!isFinite(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Returns the accent color only if it's bright enough to use as a button background; otherwise falls back to purple. */
function usableFill(accent?: string | null): string {
  const fallback = "#a855f7";
  if (!accent || !accent.startsWith("#") || accent.length < 7) return fallback;
  const r = parseInt(accent.slice(1, 3), 16);
  const g = parseInt(accent.slice(3, 5), 16);
  const b = parseInt(accent.slice(5, 7), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.12 ? accent : fallback;
}

export default function Controls(p: Props) {
  const fill = usableFill(p.accent);
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dragPct, setDragPct] = useState(0);
  const [hovering, setHovering] = useState(false);

  const pctFromEvent = useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const displayPct = dragging ? dragPct : p.duration > 0 ? p.currentTime / p.duration : 0;
  const displayTime = dragging ? dragPct * p.duration : p.currentTime;

  // Use a ref so handlers always see current drag state without stale closures
  const draggingRef = useRef(false);
  const dragPctRef = useRef(0);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const pct = pctFromEvent(e.clientX);
    draggingRef.current = true;
    dragPctRef.current = pct;
    setDragging(true);
    setDragPct(pct);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const pct = pctFromEvent(e.clientX);
    dragPctRef.current = pct;
    setDragPct(pct);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const pct = pctFromEvent(e.clientX);
    draggingRef.current = false;
    setDragging(false);
    p.onSeek(pct * p.duration);
  };

  // Cancel: abort drag without seeking
  const onPointerCancel = () => {
    draggingRef.current = false;
    setDragging(false);
  };

  const active = dragging || hovering;

  return (
    <div className="w-full">
      {/* Scrubber track */}
      <div
        className="relative w-full py-3 cursor-pointer select-none"
        ref={trackRef}
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => { if (!draggingRef.current) setHovering(false); }}
      >
        {/* Rail */}
        <div
          className="w-full rounded-full overflow-visible relative transition-all duration-150"
          style={{ height: active ? "5px" : "3px" }}
        >
          {/* Background */}
          <div className="absolute inset-0 rounded-full bg-white/20" />
          {/* Buffered placeholder — same color, subtler */}
          <div className="absolute inset-y-0 left-0 rounded-full bg-white/10" style={{ width: "100%" }} />
          {/* Filled */}
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-none"
            style={{ width: `${displayPct * 100}%`, background: fill }}
          />
          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full shadow-lg transition-all duration-150 pointer-events-none"
            style={{
              left: `${displayPct * 100}%`,
              width: active ? "14px" : "0px",
              height: active ? "14px" : "0px",
              background: "#fff",
              boxShadow: active ? `0 0 0 3px ${fill}60` : "none",
            }}
          />
        </div>
      </div>

      {/* Time display */}
      <div className="flex justify-between text-[11px] font-mono text-white/50 -mt-1 mb-6 px-0.5">
        <span>{fmt(displayTime)}</span>
        <span>-{fmt(Math.max(0, p.duration - displayTime))}</span>
      </div>

      {/* Controls row */}
      <div className="flex justify-around items-center">
        <button
          onClick={p.onShuffle}
          className={`relative transition-all duration-200 w-10 h-10 flex items-center justify-center rounded-full ${
            p.shuffle ? "text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.9)]" : "text-white/40 hover:text-white/70"
          }`}
        >
          <Shuffle size={20} />
          {p.shuffle && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-purple-400" />}
        </button>

        <button
          onClick={p.onPrev}
          disabled={p.canPrev === false}
          className="w-10 h-10 flex items-center justify-center transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed text-white/80 hover:text-white disabled:hover:text-white/80"
        >
          <SkipBack size={26} fill="currentColor" />
        </button>

        <button
          onClick={p.onPlayPause}
          className="w-[68px] h-[68px] rounded-full text-black flex items-center justify-center transition-all duration-200 active:scale-95"
          style={{ background: fill, boxShadow: `0 0 28px ${fill}80, 0 4px 16px rgba(0,0,0,0.5)` }}
        >
          {p.isPlaying ? <Pause size={28} fill="black" /> : <Play size={28} fill="black" className="translate-x-0.5" />}
        </button>

        <button
          onClick={p.onNext}
          disabled={p.canNext === false}
          className="w-10 h-10 flex items-center justify-center transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed text-white/80 hover:text-white disabled:hover:text-white/80"
        >
          <SkipForward size={26} fill="currentColor" />
        </button>

        <button
          onClick={p.onLoop}
          className={`relative transition-all duration-200 w-10 h-10 flex items-center justify-center rounded-full ${
            p.loop ? "text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.9)]" : "text-white/40 hover:text-white/70"
          }`}
        >
          <Repeat size={20} />
          {p.loop && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-pink-400" />}
        </button>
      </div>
    </div>
  );
}
