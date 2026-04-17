"use client";
import { useState } from "react";

type Preview = { title: string; artist: string | null; thumbnail: string | null; source: string; source_id: string; source_url: string };

export default function ImportForm({ onImported }: { onImported: () => void }) {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [form, setForm] = useState<{ title: string; artist: string; thumbnail_url: string }>({ title: "", artist: "", thumbnail_url: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function getPreview() {
    setErr(null); setBusy(true);
    try {
      const r = await fetch("/api/tracks/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
      if (!r.ok) { setErr("Không lấy được preview"); return; }
      const p = await r.json() as Preview;
      setPreview(p);
      setForm({ title: p.title, artist: p.artist ?? "", thumbnail_url: p.thumbnail ?? "" });
    } catch {
      setErr("Lỗi kết nối");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!preview) return;
    setErr(null); setBusy(true);
    try {
      const r = await fetch("/api/tracks", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: preview.source_url,
          title: form.title,
          artist: form.artist || null,
          thumbnail_url: form.thumbnail_url || null,
        }),
      });
      if (!r.ok) { setErr("Lỗi"); return; }
      setUrl(""); setPreview(null); setForm({ title: "", artist: "", thumbnail_url: "" });
      onImported();
    } catch {
      setErr("Lỗi kết nối");
    } finally {
      setBusy(false);
    }
  }

  if (!preview) {
    return (
      <div className="flex flex-col gap-2">
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Dán link YouTube/SoundCloud" className="p-3 rounded bg-white/10 outline-none" />
        <button onClick={getPreview} disabled={!url || busy} className="p-3 rounded bg-white text-black disabled:opacity-40">Xem trước</button>
        {err && <p className="text-red-400 text-sm">{err}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {form.thumbnail_url && <img src={form.thumbnail_url} className="w-40 h-40 object-cover rounded mx-auto" alt="" />}
      <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Tên bài" className="p-3 rounded bg-white/10" />
      <input value={form.artist} onChange={e => setForm({ ...form, artist: e.target.value })} placeholder="Nghệ sĩ" className="p-3 rounded bg-white/10" />
      <input value={form.thumbnail_url} onChange={e => setForm({ ...form, thumbnail_url: e.target.value })} placeholder="Thumbnail URL" className="p-3 rounded bg-white/10" />
      <div className="flex gap-2">
        <button onClick={() => setPreview(null)} className="flex-1 p-3 rounded bg-white/10">Huỷ</button>
        <button onClick={submit} disabled={busy} className="flex-1 p-3 rounded bg-white text-black disabled:opacity-40">Thêm</button>
      </div>
      {err && <p className="text-red-400 text-sm">{err}</p>}
    </div>
  );
}
