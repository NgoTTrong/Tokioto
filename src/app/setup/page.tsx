"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PatternLock from "@/components/Auth/PatternLock";

export default function Setup() {
  const [first, setFirst] = useState<number[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handle(seq: number[]) {
    setErr(null);
    if (!first) { setFirst(seq); return; }
    if (first.join(",") !== seq.join(",")) { setErr("Hai pattern không khớp. Thử lại."); setFirst(null); return; }
    setBusy(true);
    const r = await fetch("/api/auth/setup", { method: "POST", headers: {"content-type":"application/json"}, body: JSON.stringify({ pattern: seq }) });
    setBusy(false);
    if (r.ok) router.replace("/"); else setErr((await r.json()).error ?? "Lỗi");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#09090b] text-white gap-6 px-6">
      <div className="text-center mb-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
          Tokioto
        </h1>
        <p className="text-white/60 text-base mt-1 font-medium">
          {first ? "Vẽ lại để xác nhận" : "Tạo pattern mới"}
        </p>
        <p className="text-white/30 text-xs mt-0.5">Tối thiểu 4 điểm</p>
      </div>
      <PatternLock onSubmit={handle} disabled={busy} />
      {err && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
          {err}
        </p>
      )}
    </main>
  );
}
