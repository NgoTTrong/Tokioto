// src/components/Player/QueuePanel.tsx
"use client";
import type { Track } from "@/types";

export default function QueuePanel({
  queue, index, onPick, open, onClose,
}: {
  queue: Track[]; index: number; onPick: (i: number) => void;
  open: boolean; onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30" onClick={onClose}>
      <div
        className="absolute bottom-0 left-0 right-0 bg-[#111113]/95 backdrop-blur-2xl border-t border-white/[0.08] rounded-t-3xl p-4 max-h-[65vh] overflow-y-auto animate-sheet-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />
        <h3 className="text-[11px] uppercase tracking-[0.15em] text-white/40 mb-3 font-medium">Hàng chờ</h3>
        <ul className="flex flex-col gap-1.5">
          {queue.map((t, i) => (
            <li
              key={t.id}
              onClick={() => { onPick(i); onClose(); }}
              className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                i === index
                  ? "bg-purple-500/20 border border-purple-500/30"
                  : "hover:bg-white/[0.05]"
              }`}
            >
              <div className="w-10 h-10 rounded-lg bg-white/10 overflow-hidden flex-shrink-0">
                {t.thumbnail_url && (
                  <img
                    src={t.thumbnail_url.startsWith("http") ? t.thumbnail_url : `/api/r2/${t.thumbnail_url}`}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`truncate text-sm font-medium ${i === index ? "text-purple-300" : "text-white/90"}`}>{t.title}</div>
                <div className="text-xs opacity-50 truncate mt-0.5">{t.artist ?? "—"}</div>
              </div>
              {i === index && <div className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
