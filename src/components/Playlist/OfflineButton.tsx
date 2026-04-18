"use client";
import { useEffect, useState } from "react";
import { cacheTrack, hasCached, uncacheTrack } from "@/hooks/useOfflineCache";

export default function OfflineButton({ ids }: { ids: string[] }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [cached, setCached] = useState(0);
  useEffect(() => {
    (async () => {
      let c = 0; for (const id of ids) if (await hasCached(id)) c++;
      setCached(c);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);

  async function downloadAll() {
    setBusy(true); setDone(0);
    for (const id of ids) {
      if (!(await hasCached(id))) await cacheTrack(id).catch(() => {});
      setDone(d => d + 1);
    }
    setBusy(false); setCached(ids.length);
  }

  async function clear() {
    for (const id of ids) await uncacheTrack(id);
    setCached(0);
  }

  if (cached === ids.length && ids.length > 0) {
    return (
      <button
        onClick={clear}
        className="text-xs px-4 py-1.5 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-all font-medium"
      >
        ✓ Đã offline — bấm để xoá
      </button>
    );
  }
  return (
    <button
      disabled={busy}
      onClick={downloadAll}
      className="text-xs px-4 py-1.5 rounded-full bg-white/[0.07] border border-white/10 hover:bg-purple-500/15 hover:border-purple-500/30 hover:text-purple-300 transition-all font-medium disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {busy ? `Tải ${done}/${ids.length}…` : "Tải về offline"}
    </button>
  );
}
