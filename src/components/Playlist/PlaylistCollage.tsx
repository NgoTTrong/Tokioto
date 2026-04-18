export default function PlaylistCollage({ thumbs }: { thumbs: (string | null)[] }) {
  const cells = Array.from({ length: 4 }).map((_, i) => thumbs[i] ?? null);
  return (
    <div className="grid grid-cols-2 w-full aspect-square overflow-hidden rounded-xl bg-gradient-to-br from-purple-900/40 to-pink-900/40 border border-white/[0.06]">
      {cells.map((t, i) => (
        <div key={i} className="bg-white/[0.04] overflow-hidden">
          {t && <img src={t.startsWith("http") ? t : `/api/r2/${t}`} className="w-full h-full object-cover" alt="" />}
          {!t && (
            <div className="w-full h-full flex items-center justify-center text-white/10 text-lg">♪</div>
          )}
        </div>
      ))}
    </div>
  );
}
