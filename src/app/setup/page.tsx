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
    <main className="min-h-screen flex flex-col items-center justify-center bg-black text-white gap-4">
      <h1 className="text-xl font-semibold">{first ? "Vẽ lại để xác nhận" : "Tạo pattern mới"}</h1>
      <PatternLock onSubmit={handle} disabled={busy} />
      {err && <p className="text-red-400 text-sm">{err}</p>}
      <p className="text-xs opacity-60">Tối thiểu 4 điểm</p>
    </main>
  );
}
