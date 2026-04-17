"use client";
import { useEffect, useState } from "react";
import PlaylistCard from "@/components/Playlist/PlaylistCard";
import type { Playlist } from "@/types";

type WithThumbs = Playlist & { thumbs: (string | null)[] };

export default function Playlists() {
  const [user, setUser] = useState<WithThumbs[]>([]);
  const [smart, setSmart] = useState<WithThumbs[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  async function load() {
    const d = await fetch("/api/playlists").then(r => r.json());
    const hydrate = async (pl: Playlist) => {
      const detail = await fetch(`/api/playlists/${encodeURIComponent(pl.id)}`).then(r => r.json());
      const thumbs = (detail.tracks ?? []).slice(0, 4).map((t: { thumbnail_url: string | null }) => t.thumbnail_url ?? null);
      return { ...pl, thumbs };
    };
    setUser(await Promise.all((d.playlists as Playlist[]).map(hydrate)));
    setSmart(await Promise.all((d.smart as Playlist[]).map(hydrate)));
  }

  useEffect(() => { load(); }, []);

  async function create() {
    if (!name) return;
    await fetch("/api/playlists", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
    setName(""); setCreating(false); load();
  }

  return (
    <main className="p-4 pt-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Playlists</h1>
        <button onClick={() => setCreating(v => !v)} className="px-3 py-1 rounded bg-white/10 text-sm">+ New</button>
      </div>
      {creating && (
        <div className="flex gap-2">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Tên playlist" className="flex-1 p-2 rounded bg-white/10" />
          <button onClick={create} className="px-3 rounded bg-white text-black">Tạo</button>
        </div>
      )}
      <section>
        <h2 className="text-sm uppercase tracking-wider opacity-60 mb-2">Smart</h2>
        <div className="grid grid-cols-2 gap-3">
          {smart.map(p => <PlaylistCard key={p.id} id={p.id} name={p.name} thumbs={p.thumbs} smart />)}
        </div>
      </section>
      <section>
        <h2 className="text-sm uppercase tracking-wider opacity-60 mb-2">Của tôi</h2>
        <div className="grid grid-cols-2 gap-3">
          {user.map(p => <PlaylistCard key={p.id} id={p.id} name={p.name} thumbs={p.thumbs} />)}
        </div>
      </section>
    </main>
  );
}
