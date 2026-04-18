"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PatternLock from "@/components/Auth/PatternLock";
import logoImg from "@/../public/logo.png";
import { Toaster, useToast } from "@/components/UI/Toast";

export default function Login() {
  const { toasts, remove, success, error } = useToast();
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/status").then(r => r.json()).then(s => { if (s.needsSetup) router.replace("/setup"); }).catch(() => {});
  }, [router]);

  async function handle(seq: number[]) {
    setBusy(true);
    const r = await fetch("/api/auth/login", { method: "POST", headers: {"content-type":"application/json"}, body: JSON.stringify({ pattern: seq }) });
    if (r.ok) {
      success("Đăng nhập thành công!");
      setTimeout(() => router.replace("/"), 600);
    } else {
      setBusy(false);
      const body = await r.json().catch(() => ({}));
      if (r.status === 423) error(`Bị khoá tới ${new Date(body.until).toLocaleTimeString()}`);
      else error("Pattern sai, thử lại");
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#09090b] text-white px-6 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)" }} />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(236,72,153,0.07) 0%, transparent 70%)" }} />

      <div className="relative flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoImg.src} alt="Tokioto" width={72} height={72} className="drop-shadow-[0_0_24px_rgba(168,85,247,0.5)]" />
          <div>
            <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-purple-400 via-fuchsia-300 to-pink-400 bg-clip-text text-transparent mb-2">
              Tokioto
            </h1>
            <p className="text-white/30 text-sm tracking-wide">Vẽ pattern để vào</p>
          </div>
        </div>

        <div className="relative">
          <PatternLock onSubmit={handle} disabled={busy} />
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 backdrop-blur-sm">
              <div className="flex gap-1.5">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"
                    style={{ animationDelay: `${i * 120}ms` }} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Toaster toasts={toasts} onRemove={remove} />
    </main>
  );
}
