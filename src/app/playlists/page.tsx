"use client";
import { useEffect, useState } from "react";
import PlaylistCard from "@/components/Playlist/PlaylistCard";
import type { Playlist } from "@/types";

type WithThumbs = Playlist & { thumbs: (string | null)[] };

function PlaylistSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-white/[0.06]">
        <div className="grid grid-cols-2 w-full h-full">
          {[0,1,2,3].map(i => (
            <div key={i} className="bg-white/[0.04] animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      </div>
      <div className="h-3.5 rounded-full bg-white/[0.06] animate-pulse w-3/4" />
    </div>
  );
}

export default function Playlists() {
  const [user, setUser] = useState<WithThumbs[] | null>(null);
  const [smart, setSmart] = useState<WithThumbs[] | null>(null);
  const [artists, setArtists] = useState<WithThumbs[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  async function load() {
    const d = await fetch("/api/playlists").then(r => r.json());
    // thumbs are now included directly — no N+1 hydration calls
    setUser(d.playlists as WithThumbs[]);
    setSmart(d.smart as WithThumbs[]);
    setArtists(d.artists as WithThumbs[]);
  }

  useEffect(() => { load(); }, []);

  async function create() {
    if (!name) return;
    await fetch("/api/playlists", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
    setName(""); setCreating(false); load();
  }

  return (
    <main className="p-4 pt-10 pb-24 md:px-8 md:pt-12 md:pb-10 min-h-screen bg-[#09090b] flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
          Playlists
        </h1>
        <button
          onClick={() => setCreating(v => !v)}
          className="px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-500/40 hover:from-purple-600/50 hover:to-pink-600/50 text-purple-300 hover:text-white text-sm font-medium transition-all"
        >
          + New
        </button>
      </div>

      {creating && (
        <div className="flex gap-2 animate-fade-in-up">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Tên playlist"
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 focus:border-purple-500/60 outline-none text-sm placeholder:text-white/30 transition-all"
          />
          <button
            onClick={create}
            className="px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium hover:from-purple-500 hover:to-pink-500 transition-all"
          >
            Tạo
          </button>
        </div>
      )}

      <section>
        <h2 className="text-[11px] uppercase tracking-[0.15em] text-white/40 mb-3">Smart</h2>
        {smart === null ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[0, 1, 2].map(i => <PlaylistSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {smart.map(p => <PlaylistCard key={p.id} id={p.id} name={p.name} thumbs={p.thumbs} smart />)}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-[11px] uppercase tracking-[0.15em] text-white/40 mb-3">Nghệ sĩ</h2>
        {artists === null ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map(i => <PlaylistSkeleton key={i} />)}
          </div>
        ) : artists.length === 0 ? (
          <p className="text-white/25 text-xs">Chưa có nghệ sĩ nào.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {artists.map(p => <PlaylistCard key={p.id} id={p.id} name={p.name} thumbs={p.thumbs} smart />)}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-[11px] uppercase tracking-[0.15em] text-white/40 mb-3">Của tôi</h2>
        {user === null ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[0, 1].map(i => <PlaylistSkeleton key={i} />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {user.map(p => <PlaylistCard key={p.id} id={p.id} name={p.name} thumbs={p.thumbs} />)}
            </div>
            {user.length === 0 && (
              <p className="text-white/25 text-xs">Chưa có playlist nào. Nhấn "+ New" để tạo.</p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
