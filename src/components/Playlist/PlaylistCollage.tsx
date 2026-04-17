export default function PlaylistCollage({ thumbs }: { thumbs: (string | null)[] }) {
  const cells = Array.from({ length: 4 }).map((_, i) => thumbs[i] ?? null);
  return (
    <div className="grid grid-cols-2 w-full aspect-square overflow-hidden rounded-md bg-white/10">
      {cells.map((t, i) => (
        <div key={i} className="bg-white/5">
          {t && <img src={t.startsWith("http") ? t : `/api/r2/${t}`} className="w-full h-full object-cover" alt="" />}
        </div>
      ))}
    </div>
  );
}
