// src/components/Player/QueuePanel.tsx
"use client";
import { useState } from "react";
import type { Track } from "@/types";

export default function QueuePanel({ queue, index, onPick }: { queue: Track[]; index: number; onPick: (i: number) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="absolute bottom-2 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-white/40 rounded-full" aria-label="open queue" />
      {open && (
        <div className="fixed inset-0 bg-black/60 z-30" onClick={() => setOpen(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-neutral-900 rounded-t-2xl p-4 max-h-[65vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1.5 bg-white/30 rounded-full mx-auto mb-4" />
            <h3 className="text-sm uppercase tracking-wider opacity-60 mb-2">Queue</h3>
            <ul className="flex flex-col gap-2">
              {queue.map((t, i) => (
                <li key={t.id} onClick={() => { onPick(i); setOpen(false); }}
                  className={`flex items-center gap-3 p-2 rounded ${i === index ? "bg-white/10" : ""}`}>
                  <div className="w-10 h-10 rounded bg-white/10 overflow-hidden">
                    {t.thumbnail_url && <img src={t.thumbnail_url.startsWith("http") ? t.thumbnail_url : `/api/r2/${t.thumbnail_url}`} className="w-full h-full object-cover" alt="" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm">{t.title}</div>
                    <div className="text-xs opacity-60 truncate">{t.artist ?? "—"}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
