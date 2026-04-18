"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PatternLock from "@/components/Auth/PatternLock";
import logoImg from "@/../public/logo.png";

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
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#09090b] text-white px-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)" }} />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(236,72,153,0.07) 0%, transparent 70%)" }} />

      <div className="relative flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoImg.src} alt="Tokioto" width={72} height={72} className="drop-shadow-[0_0_24px_rgba(168,85,247,0.5)]" />
          <div>
            <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-purple-400 via-fuchsia-300 to-pink-400 bg-clip-text text-transparent mb-2">
              Tokioto
            </h1>
            <p className="text-white/30 text-sm tracking-wide">Vẽ pattern để vào</p>
          </div>
        </div>

        <PatternLock onSubmit={handle} disabled={busy} />

        {err && (
          <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
            {err}
          </p>
        )}
      </div>
    </main>
  );
}
