"use client";
import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Track } from "@/types";
import { ChevronLeft, GripVertical, Trash2 } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import TrackCard from "@/components/Library/TrackCard";
import OfflineButton from "@/components/Playlist/OfflineButton";
import ConfirmDialog from "@/components/UI/ConfirmDialog";
import { Toaster, useToast } from "@/components/UI/Toast";

function TrackSkeleton() {
  return (
    <div className="flex items-center gap-3 w-full p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
      <div className="w-[56px] h-[56px] rounded-xl bg-white/[0.07] animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 rounded-full bg-white/[0.07] animate-pulse w-3/4" />
        <div className="h-3 rounded-full bg-white/[0.05] animate-pulse w-1/2" />
      </div>
    </div>
  );
}

export default function PlaylistDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params);
  const id = decodeURIComponent(rawId);
  const router = useRouter();
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [name, setName] = useState("");
  const [smart, setSmart] = useState(false);
  const [removeTrack, setRemoveTrack] = useState<Track | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const load = useCallback(async () => {
    const d = await fetch(`/api/playlists/${encodeURIComponent(id)}`).then(r => r.json());
    setTracks(d.tracks ?? []);
    setName(d.playlist?.name ?? id);
    setSmart(!!d.playlist?.smart);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id || !tracks) return;
    const oldIdx = tracks.findIndex(t => t.id === e.active.id);
    const newIdx = tracks.findIndex(t => t.id === e.over!.id);
    const next = arrayMove(tracks, oldIdx, newIdx);
    setTracks(next);
    await fetch(`/api/playlists/${encodeURIComponent(id)}/reorder`, {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ order: next.map(t => t.id) }),
    });
  }

  async function confirmRemoveTrack() {
    if (!removeTrack || !tracks) return;
    const target = removeTrack;
    setBusy(true);
    const res = await fetch(
      `/api/playlists/${encodeURIComponent(id)}/tracks/${target.id}`,
      { method: "DELETE" }
    );
    setBusy(false);
    if (!res.ok) {
      toast.error("Xoá thất bại");
      return;
    }
    setTracks(tracks.filter(t => t.id !== target.id));
    setRemoveTrack(null);
    toast.success(`Đã xoá "${target.title}"`);
  }

  async function confirmDeletePlaylist() {
    setBusy(true);
    const res = await fetch(`/api/playlists/${encodeURIComponent(id)}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      toast.error("Xoá playlist thất bại");
      setDeleteOpen(false);
      return;
    }
    router.push("/playlists");
  }

  return (
    <main className="p-4 pt-10 pb-24 md:px-8 md:pt-12 md:pb-10 min-h-screen bg-[#09090b] flex flex-col gap-4 page-enter-right max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.10] transition-colors text-white/60 hover:text-white flex-shrink-0">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent truncate">{name || "…"}</h1>
          {tracks && tracks.length > 0 && <p className="text-white/30 text-xs mt-0.5">{tracks.length} bài hát</p>}
        </div>
        {!smart && tracks !== null && (
          <button
            onClick={() => setDeleteOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.04] hover:bg-red-500/15 border border-white/[0.06] hover:border-red-500/40 text-white/50 hover:text-red-400 transition-colors flex-shrink-0"
            title="Xoá playlist"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
      {tracks === null ? (
        <div className="flex flex-col gap-2">
          {[0,1,2,3].map(i => (
            <div key={i} style={{ animationDelay: `${i * 60}ms` }}>
              <TrackSkeleton />
            </div>
          ))}
        </div>
      ) : (
        <>
          {!smart && <OfflineButton ids={tracks.map(t => t.id)} />}
          {!smart ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={tracks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                {tracks.map(t => (
                  <SortableRow
                    key={t.id}
                    track={t}
                    onPlay={() => router.push(`/player?track=${t.id}&playlist=${encodeURIComponent(id)}`)}
                    onRemove={() => setRemoveTrack(t)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            tracks.map(t => <TrackCard key={t.id} track={t} onPlay={() => router.push(`/player?track=${t.id}&playlist=${encodeURIComponent(id)}`)} />)
          )}
        </>
      )}

      <ConfirmDialog
        open={removeTrack !== null}
        title="Xoá khỏi playlist?"
        message={removeTrack ? `"${removeTrack.title}" sẽ bị xoá khỏi playlist. Bài hát vẫn còn trong thư viện.` : ""}
        confirmText="Xoá"
        destructive
        loading={busy}
        onConfirm={confirmRemoveTrack}
        onCancel={() => setRemoveTrack(null)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Xoá playlist?"
        message={`Playlist "${name}" sẽ bị xoá vĩnh viễn. Các bài hát vẫn còn trong thư viện.`}
        confirmText="Xoá playlist"
        destructive
        loading={busy}
        onConfirm={confirmDeletePlaylist}
        onCancel={() => setDeleteOpen(false)}
      />

      <Toaster toasts={toast.toasts} onRemove={toast.remove} />
    </main>
  );
}

function SortableRow({ track, onPlay, onRemove }: { track: Track; onPlay: () => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: track.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const handle = (
    <button
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label="Kéo để sắp xếp"
      className="p-1.5 -ml-1 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/[0.06] cursor-grab active:cursor-grabbing touch-none flex-shrink-0 transition-colors"
    >
      <GripVertical size={16} />
    </button>
  );

  return (
    <div ref={setNodeRef} style={style}>
      <TrackCard track={track} onPlay={onPlay} onRemove={onRemove} dragHandle={handle} />
    </div>
  );
}
