"use client";
import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Track } from "@/types";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import TrackCard from "@/components/Library/TrackCard";
import OfflineButton from "@/components/Playlist/OfflineButton";

export default function PlaylistDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [name, setName] = useState("");
  const [smart, setSmart] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const load = useCallback(async () => {
    const d = await fetch(`/api/playlists/${encodeURIComponent(id)}`).then(r => r.json());
    setTracks(d.tracks); setName(d.playlist.name); setSmart(!!d.playlist.smart);
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
    <main className="p-4 pt-8 flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{name}</h1>
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
