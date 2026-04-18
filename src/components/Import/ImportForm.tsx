"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";

type Preview = {
  title: string;
  artist: string | null;
  thumbnail: string | null;
  source: string;
  source_id: string;
  source_url: string;
};

const inputClass =
  "w-full bg-white/[0.06] border border-white/10 focus:border-purple-500/60 focus:bg-white/[0.08] rounded-xl px-4 py-3 outline-none transition-all placeholder:text-white/30 text-white text-sm";

export default function ImportForm({ onImported }: { onImported: () => void }) {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [form, setForm] = useState<{ title: string; artist: string; thumbnail_url: string }>({
    title: "",
    artist: "",
    thumbnail_url: "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function getPreview() {
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch("/api/tracks/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!r.ok) {
        setErr("Không lấy được preview");
        return;
      }
      const p = (await r.json()) as Preview;
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
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch("/api/tracks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: preview.source_url,
          title: form.title,
          artist: form.artist || null,
          thumbnail_url: form.thumbnail_url || null,
        }),
      });
      if (!r.ok) {
        setErr("Lỗi");
        return;
      }
      setUrl("");
      setPreview(null);
      setForm({ title: "", artist: "", thumbnail_url: "" });
      onImported();
    } catch {
      setErr("Lỗi kết nối");
    } finally {
      setBusy(false);
    }
  }

  if (!preview) {
    return (
      <div className="flex flex-col gap-3">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Dán link YouTube/SoundCloud"
          className={inputClass}
        />
        <button
          onClick={getPreview}
          disabled={!url || busy}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl py-3 font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {busy ? "Đang tải…" : "Xem trước"}
        </button>
        {err && <p className="text-red-400 text-sm">{err}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {form.thumbnail_url && (
        <img
          src={form.thumbnail_url}
          className="w-40 h-40 object-cover rounded-2xl mx-auto"
          alt=""
        />
      )}
      <input
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        placeholder="Tên bài"
        className={inputClass}
      />
      <input
        value={form.artist}
        onChange={(e) => setForm({ ...form, artist: e.target.value })}
        placeholder="Nghệ sĩ"
        className={inputClass}
      />
      <div className="flex gap-2">
        <button
          onClick={() => setPreview(null)}
          className="flex-1 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white/70 hover:bg-white/[0.10] transition-all text-sm font-medium"
        >
          Huỷ
        </button>
        <button
          onClick={submit}
          disabled={busy}
          className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {busy ? "Đang thêm…" : "Thêm"}
        </button>
      </div>
      {err && <p className="text-red-400 text-sm">{err}</p>}
    </div>
  );
}
