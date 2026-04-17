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
    return <button onClick={clear} className="text-xs px-3 py-1 rounded bg-white/10">✓ Đã offline — bấm để xoá</button>;
  }
  return <button disabled={busy} onClick={downloadAll} className="text-xs px-3 py-1 rounded bg-white/10 disabled:opacity-40">
    {busy ? `Tải ${done}/${ids.length}…` : "Tải về offline"}
  </button>;
}
