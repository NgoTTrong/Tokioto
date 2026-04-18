// src/components/Player/Vinyl.tsx
"use client";

export default function Vinyl({ src, playing }: { src: string | null; playing: boolean }) {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] md:w-[45%] aspect-square">
      <style dangerouslySetInnerHTML={{ __html: `@keyframes vinyl-spin { to { transform: rotate(360deg); } }` }} />
      <div
        className="w-full h-full rounded-full relative shadow-[0_30px_70px_rgba(0,0,0,0.7)] overflow-hidden"
        style={{
          backgroundImage: src ? `url(${src})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          animation: "vinyl-spin 12s linear infinite",
          animationPlayState: playing ? "running" : "paused",
        }}
      >
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `
              radial-gradient(circle, transparent 46%, rgba(0,0,0,0.22) 47%, rgba(0,0,0,0.22) 47.5%, transparent 48%),
              radial-gradient(circle, transparent 38%, rgba(0,0,0,0.22) 39%, rgba(0,0,0,0.22) 39.5%, transparent 40%),
              radial-gradient(circle, transparent 30%, rgba(0,0,0,0.3)  31%, rgba(0,0,0,0.3)  31.5%, transparent 32%)
            `,
          }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[8%] aspect-square rounded-full bg-black border-2 border-white/30" />
      </div>
    </div>
  );
}
