"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PatternLock from "@/components/Auth/PatternLock";
import logoImg from "@/../public/logo.png";
import { Toaster, useToast } from "@/components/UI/Toast";

type Mode = "initial-setup" | "change-pattern";
type Phase = "first" | "confirm";

export default function Setup() {
  const { toasts, remove, success, error } = useToast();
  const [mode, setMode] = useState<Mode | null>(null); // null = loading
  const [phase, setPhase] = useState<Phase>("first");
  const [first, setFirst] = useState<number[] | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/status")
      .then(r => r.json())
      .then(s => {
        if (s.needsSetup) { setMode("initial-setup"); return; }
        if (s.isLoggedIn) { setMode("change-pattern"); return; }
        router.replace("/login");
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  async function handle(seq: number[]) {
    if (phase === "first") {
      setFirst(seq);
      setPhase("confirm");
      return;
    }

    // Confirm phase
    if (first!.join(",") !== seq.join(",")) {
      error("Hai pattern không khớp. Thử lại.");
      setFirst(null);
      setPhase("first");
      return;
    }

    setBusy(true);
    const endpoint = mode === "initial-setup" ? "/api/auth/setup" : "/api/auth/change-pattern";
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pattern: seq }),
    });
    setBusy(false);

    if (r.ok) {
      success(mode === "initial-setup" ? "Pattern đã được tạo!" : "Pattern đã được đổi!");
      setTimeout(() => router.replace("/"), 800);
    } else {
      const body = await r.json().catch(() => ({}));
      error(body.error ?? "Có lỗi xảy ra");
      setFirst(null);
      setPhase("first");
    }
  }

  const title = mode === "change-pattern" ? "Đổi pattern" : "Tạo pattern";
  const subtitle =
    mode === null ? "Đang tải…" :
    phase === "first" ? (mode === "change-pattern" ? "Vẽ pattern mới" : "Vẽ pattern của bạn") :
    "Vẽ lại để xác nhận";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#09090b] text-white px-6 relative overflow-hidden">
      {/* Gradient blobs */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)" }} />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(236,72,153,0.07) 0%, transparent 70%)" }} />

      <div className="relative flex flex-col items-center gap-8">
        {/* Logo + title */}
        <div className="flex flex-col items-center gap-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoImg.src} alt="Tokioto" width={72} height={72} className="drop-shadow-[0_0_24px_rgba(168,85,247,0.5)]" />
          <div>
            <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-purple-400 via-fuchsia-300 to-pink-400 bg-clip-text text-transparent mb-2">
              {title}
            </h1>
            <p className="text-white/50 text-sm tracking-wide">{subtitle}</p>
            {phase === "first" && mode !== null && (
              <p className="text-white/25 text-xs mt-1">Tối thiểu 4 điểm</p>
            )}
            {phase === "confirm" && (
              <p className="text-white/25 text-xs mt-1">Xác nhận pattern vừa vẽ</p>
            )}
          </div>
        </div>

        {/* Phase indicator */}
        {mode !== null && (
          <div className="flex gap-2">
            {(["first", "confirm"] as Phase[]).map((p) => (
              <div key={p} className={`h-1 w-8 rounded-full transition-all duration-300 ${phase === p ? "bg-purple-400" : p === "confirm" && phase === "first" ? "bg-white/10" : "bg-purple-400/40"}`} />
            ))}
          </div>
        )}

        {/* Pattern lock with loading overlay */}
        <div className="relative">
          {mode === null ? (
            <div className="w-[260px] h-[260px] flex items-center justify-center">
              <div className="flex gap-1.5">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-purple-400/40 animate-pulse"
                    style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          ) : (
            <PatternLock key={`${phase}-${first?.join("")}`} onSubmit={handle} disabled={busy} />
          )}
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

        {/* Back to login for change-pattern mode */}
        {mode === "change-pattern" && (
          <button
            onClick={() => router.replace("/")}
            className="text-white/25 hover:text-white/50 text-xs transition-colors"
          >
            Huỷ, quay lại
          </button>
        )}
      </div>

      <Toaster toasts={toasts} onRemove={remove} />
    </main>
  );
}
