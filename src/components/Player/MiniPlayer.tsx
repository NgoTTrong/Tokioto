"use client";
import Link from "next/link";
import { useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Play, Pause, SkipForward, SkipBack, Repeat } from "lucide-react";
import { usePlayer } from "@/hooks/usePlayer";

function usableFill(accent?: string | null): string {
  const fallback = "#a855f7";
  if (!accent || !accent.startsWith("#") || accent.length < 7) return fallback;
  const r = parseInt(accent.slice(1, 3), 16);
  const g = parseInt(accent.slice(3, 5), 16);
  const b = parseInt(accent.slice(5, 7), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.12 ? accent : fallback;
}

function fmt(t: number) {
  if (!isFinite(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function MiniPlayer() {
  const p = usePlayer();
  const path = usePathname();
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [dragPct, setDragPct] = useState(0);

  const pctFromEvent = useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const onDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = true;
    setDragging(true);
    setDragPct(pctFromEvent(e.clientX));
  };
  const onMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    setDragPct(pctFromEvent(e.clientX));
  };
  const onUp = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    p.seek(pctFromEvent(e.clientX) * p.duration);
  };
  const onCancel = () => { draggingRef.current = false; setDragging(false); };

  if (!p.current || path.startsWith("/player") || path === "/login" || path === "/setup") return null;

  const rawPct  = p.duration > 0 ? p.currentTime / p.duration : 0;
  const displayPct = dragging ? dragPct : rawPct;
  const displayTime = dragging ? dragPct * p.duration : p.currentTime;
  const fill = usableFill(p.current.accent_color);
  const playerHref = p.playlistId
    ? `/player?track=${p.current.id}&playlist=${encodeURIComponent(p.playlistId)}`
    : `/player?track=${p.current.id}`;
  const src = p.current.thumbnail_url
    ? p.current.thumbnail_url.startsWith("http")
      ? p.current.thumbnail_url
      : `/api/r2/${p.current.thumbnail_url}`
    : null;

  return (
    <>
      {/* ─── Mobile: floating card above TabBar ─── */}
      <div className="md:hidden fixed bottom-[64px] left-0 right-0 z-10 px-3 pb-1">
        <div
          className="relative rounded-2xl overflow-hidden border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
          style={{ background: "rgba(18,18,20,0.92)", backdropFilter: "blur(20px)" }}
        >
          <div className="h-[2px] w-full bg-white/10">
            <div className="h-full rounded-full" style={{ width: `${rawPct * 100}%`, background: fill }} />
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5">
            <Link href={playerHref} className="flex-shrink-0 relative">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10">
                {src && <img src={src} alt="" className="w-full h-full object-cover" />}
              </div>
              {p.isPlaying && (
                <div className="absolute inset-0 rounded-xl bg-black/50 flex items-end justify-center gap-[2px] pb-[6px]">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="w-[3px] rounded-full"
                      style={{ background: fill, animation: `mini-bar 0.8s ease-in-out ${i * 0.15}s infinite alternate`, height: "10px" }}
                    />
                  ))}
                </div>
              )}
            </Link>
            <Link href={playerHref} className="flex-1 min-w-0">
              <div className="truncate text-sm font-medium text-white leading-tight">{p.current.title}</div>
              <div className="truncate text-xs text-white/45 mt-0.5">{p.current.artist ?? "—"}</div>
            </Link>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={p.toggle} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white">
                {p.isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" className="translate-x-px" />}
              </button>
              <button
                onClick={p.next}
                disabled={p.index >= p.queue.length - 1}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed"
              >
                <SkipForward size={18} fill="currentColor" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Desktop: full bottom bar ─── */}
      <div
        className="hidden md:flex fixed bottom-0 left-[220px] right-0 h-[80px] z-20 items-center px-6 gap-6 border-t border-white/[0.06]"
        style={{ background: "rgba(8,8,10,0.97)", backdropFilter: "blur(24px)" }}
      >
        {/* Track info */}
        <Link href={playerHref} className="flex items-center gap-3 w-[200px] min-w-0 flex-shrink-0 group">
          <div className="w-11 h-11 rounded-lg overflow-hidden bg-white/10 flex-shrink-0 shadow-md">
            {src && <img src={src} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white group-hover:text-purple-300 transition-colors leading-tight">
              {p.current.title}
            </div>
            <div className="truncate text-xs text-white/40 mt-0.5">{p.current.artist ?? "—"}</div>
          </div>
        </Link>

        {/* Centre: controls + scrubber */}
        <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
          {/* Playback row */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={p.prev}
              disabled={p.index === 0}
              className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white transition-colors disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:text-white/50"
            >
              <SkipBack size={18} fill="currentColor" />
            </button>
            <button
              onClick={p.toggle}
              className="w-9 h-9 rounded-full flex items-center justify-center text-black transition-all active:scale-95 shadow-lg"
              style={{ background: fill, boxShadow: `0 0 18px ${fill}60` }}
            >
              {p.isPlaying
                ? <Pause size={18} fill="black" />
                : <Play size={18} fill="black" className="translate-x-px" />}
            </button>
            <button
              onClick={p.next}
              disabled={p.index >= p.queue.length - 1}
              className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white transition-colors disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:text-white/50"
            >
              <SkipForward size={18} fill="currentColor" />
            </button>
          </div>

          {/* Scrubber row */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-white/35 w-8 text-right flex-shrink-0">
              {fmt(displayTime)}
            </span>
            <div
              ref={trackRef}
              className="flex-1 relative py-2 cursor-pointer group/bar"
              style={{ touchAction: "none" }}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onCancel}
            >
              <div className="w-full h-[3px] group-hover/bar:h-[4px] rounded-full bg-white/15 relative transition-all duration-100">
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${displayPct * 100}%`, background: fill }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none"
                  style={{ left: `${displayPct * 100}%` }}
                />
              </div>
            </div>
            <span className="text-[10px] font-mono text-white/35 w-8 flex-shrink-0">
              -{fmt(Math.max(0, p.duration - displayTime))}
            </span>
          </div>
        </div>

        {/* Right: loop */}
        <div className="w-[80px] flex items-center justify-end gap-1 flex-shrink-0">
          <button
            onClick={() => p.setLoop(!p.loop)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
              p.loop ? "text-pink-400 drop-shadow-[0_0_6px_rgba(236,72,153,0.8)]" : "text-white/30 hover:text-white/70"
            }`}
          >
            <Repeat size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
