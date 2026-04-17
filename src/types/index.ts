export type Track = {
  id: string; source: "youtube" | "soundcloud"; title: string; artist: string | null;
  duration_sec: number | null; thumbnail_url: string | null; r2_key: string | null;
  accent_color: string | null; status: "pending" | "processing" | "ready" | "failed";
  added_at: string; played_count: number;
};
export type Playlist = { id: string; name: string; description: string | null; thumbnail_url: string | null; created_at: string; smart?: boolean };
