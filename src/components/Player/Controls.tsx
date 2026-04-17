// src/components/Player/Controls.tsx
"use client";

type Props = {
  isPlaying: boolean; currentTime: number; duration: number;
  onPlayPause: () => void; onNext: () => void; onPrev: () => void;
  onSeek: (t: number) => void; accent?: string | null;
  shuffle: boolean; onShuffle: () => void; loop: boolean; onLoop: () => void;
};

function fmt(t: number) { if (!isFinite(t)) return "0:00"; const m = Math.floor(t / 60); const s = Math.floor(t % 60); return `${m}:${s.toString().padStart(2,"0")}`; }

export default function Controls(p: Props) {
  const pct = p.duration > 0 ? (p.currentTime / p.duration) * 100 : 0;
  const fill = p.accent ?? "#ffffff";
  return (
    <div className="w-full">
      <div className="h-[3px] w-full bg-white/25 rounded overflow-hidden" onClick={(e) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        p.onSeek(((e.clientX - rect.left) / rect.width) * p.duration);
      }}>
        <div style={{ width: `${pct}%`, background: fill }} className="h-full" />
      </div>
      <div className="flex justify-between text-[10px] opacity-70 mt-1 mb-4"><span>{fmt(p.currentTime)}</span><span>-{fmt(Math.max(0, p.duration - p.currentTime))}</span></div>
      <div className="flex justify-around items-center">
        <button onClick={p.onShuffle} className={p.shuffle ? "opacity-100" : "opacity-60"}>🔀</button>
        <button onClick={p.onPrev}>⏮</button>
        <button onClick={p.onPlayPause} className="w-16 h-16 rounded-full text-black text-2xl" style={{ background: fill }}>{p.isPlaying ? "⏸" : "▶"}</button>
        <button onClick={p.onNext}>⏭</button>
        <button onClick={p.onLoop} className={p.loop ? "opacity-100" : "opacity-60"}>🔁</button>
      </div>
    </div>
  );
}
