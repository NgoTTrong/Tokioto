"use client";
import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Track } from "@/types";
import { ChevronLeft } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import TrackCard from "@/components/Library/TrackCard";
import OfflineButton from "@/components/Playlist/OfflineButton";

export default function PlaylistDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params);
  const id = decodeURIComponent(rawId);
  const router = useRouter();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [name, setName] = useState("");
  const [smart, setSmart] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const load = useCallback(async () => {
    const d = await fetch(`/api/playlists/${encodeURIComponent(id)}`).then(r => r.json());
    setTracks(d.tracks ?? []);
    setName(d.playlist?.name ?? id);
    setSmart(!!d.playlist?.smart);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIdx = tracks.findIndex(t => t.id === e.active.id);
    const newIdx = tracks.findIndex(t => t.id === e.over!.id);
    const next = arrayMove(tracks, oldIdx, newIdx);
    setTracks(next);
    await fetch(`/api/playlists/${encodeURIComponent(id)}/reorder`, {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ order: next.map(t => t.id) }),
    });
  }

  return (
    <main className="p-4 pt-10 pb-24 md:px-8 md:pt-12 md:pb-10 min-h-screen bg-[#09090b] flex flex-col gap-4 page-enter-right max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.10] transition-colors text-white/60 hover:text-white flex-shrink-0">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent truncate">{name || "…"}</h1>
          {tracks.length > 0 && <p className="text-white/30 text-xs mt-0.5">{tracks.length} bài hát</p>}
        </div>
      </div>
      {!smart && <OfflineButton ids={tracks.map(t => t.id)} />}
      {!smart ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={tracks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {tracks.map(t => <SortableRow key={t.id} track={t} onPlay={() => router.push(`/player?track=${t.id}&playlist=${encodeURIComponent(id)}`)} />)}
          </SortableContext>
        </DndContext>
      ) : (
        tracks.map(t => <TrackCard key={t.id} track={t} onPlay={() => router.push(`/player?track=${t.id}&playlist=${encodeURIComponent(id)}`)} />)
      )}
    </main>
  );
}

function SortableRow({ track, onPlay }: { track: Track; onPlay: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: track.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TrackCard track={track} onPlay={onPlay} />
    </div>
  );
}
