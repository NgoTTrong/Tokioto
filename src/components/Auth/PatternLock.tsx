"use client";
import { useRef, useState } from "react";

type Props = { onSubmit: (seq: number[]) => void; disabled?: boolean };

const DOT_COUNT = 9;
const GRID = 3;
const MIDDLE: Record<string, number> = {
  "0-2": 1, "2-0": 1, "3-5": 4, "5-3": 4, "6-8": 7, "8-6": 7,
  "0-6": 3, "6-0": 3, "1-7": 4, "7-1": 4, "2-8": 5, "8-2": 5,
  "0-8": 4, "8-0": 4, "2-6": 4, "6-2": 4,
};

export default function PatternLock({ onSubmit, disabled }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [seq, setSeq] = useState<number[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [ptr, setPtr] = useState<{ x: number; y: number } | null>(null);

  const dotPos = (i: number) => {
    const col = i % GRID, row = Math.floor(i / GRID);
    const step = 100;
    return { x: 50 + col * step, y: 50 + row * step };
  };

  const hitTest = (clientX: number, clientY: number): number | null => {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 300;
    const y = ((clientY - rect.top) / rect.height) * 300;
    for (let i = 0; i < DOT_COUNT; i++) {
      const p = dotPos(i);
      if ((x - p.x) ** 2 + (y - p.y) ** 2 < 30 ** 2) return i;
    }
    return null;
  };

  const addDot = (i: number) => {
    setSeq((prev) => {
      if (prev.includes(i)) return prev;
      if (prev.length > 0) {
        const mid = MIDDLE[`${prev[prev.length - 1]}-${i}`];
        if (mid !== undefined && !prev.includes(mid)) return [...prev, mid, i];
      }
      return [...prev, i];
    });
  };

  const start = (e: React.PointerEvent) => {
    if (disabled) return;
    const hit = hitTest(e.clientX, e.clientY);
    if (hit === null) return;
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    setSeq([hit]);
    setDrawing(true);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing) return;
    const rect = svgRef.current!.getBoundingClientRect();
    setPtr({ x: ((e.clientX - rect.left) / rect.width) * 300, y: ((e.clientY - rect.top) / rect.height) * 300 });
    const hit = hitTest(e.clientX, e.clientY);
    if (hit !== null) addDot(hit);
  };
  const end = () => {
    if (!drawing) return;
    setDrawing(false);
    setPtr(null);
    setSeq((current) => {
      if (current.length >= 4) {
        // Use setTimeout to call onSubmit outside the state updater
        setTimeout(() => onSubmit(current), 0);
      }
      return current;
    });
    setTimeout(() => setSeq([]), 400);
  };

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 300 300"
      className="w-64 h-64 touch-none select-none"
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {seq.map((idx, i) => {
        if (i === 0) return null;
        const a = dotPos(seq[i - 1]);
        const b = dotPos(idx);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="white" strokeWidth="4" opacity="0.8" />;
      })}
      {drawing && seq.length > 0 && ptr && (() => {
        const a = dotPos(seq[seq.length - 1]);
        return <line x1={a.x} y1={a.y} x2={ptr.x} y2={ptr.y} stroke="white" strokeWidth="3" opacity="0.4" />;
      })()}
      {Array.from({ length: DOT_COUNT }).map((_, i) => {
        const p = dotPos(i);
        const active = seq.includes(i);
        return (
          <circle key={i} cx={p.x} cy={p.y} r={active ? 14 : 10} fill={active ? "white" : "rgba(255,255,255,0.4)"} />
        );
      })}
    </svg>
  );
}
