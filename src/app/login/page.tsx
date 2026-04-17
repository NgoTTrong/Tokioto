"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PatternLock from "@/components/Auth/PatternLock";

export default function Login() {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/status").then(r => r.json()).then(s => { if (s.needsSetup) router.replace("/setup"); }).catch(() => {});
  }, [router]);

  async function handle(seq: number[]) {
    setErr(null); setBusy(true);
    const r = await fetch("/api/auth/login", { method: "POST", headers: {"content-type":"application/json"}, body: JSON.stringify({ pattern: seq }) });
    setBusy(false);
    if (r.ok) router.replace("/");
    else {
      const body = await r.json().catch(() => ({}));
      if (r.status === 423) setErr(`Tài khoản bị khoá tới ${new Date(body.until).toLocaleTimeString()}`);
      else setErr("Pattern sai");
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-black text-white gap-4">
      <h1 className="text-xl font-semibold">Vẽ pattern để vào</h1>
      <PatternLock onSubmit={handle} disabled={busy} />
      {err && <p className="text-red-400 text-sm">{err}</p>}
    </main>
  );
}
