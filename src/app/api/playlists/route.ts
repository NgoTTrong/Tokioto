import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { getServiceClient } from "@/lib/db";

const Body = z.object({ name: z.string().min(1), description: z.string().nullable().optional() });

const toArr = (rows: { thumbnail_url: string | null }[] | null) =>
  (rows ?? []).map(r => r.thumbnail_url ?? null);

export async function GET(req: NextRequest) {
  const denied = await requireAuth(req); if (denied) return denied;
  const db = getServiceClient();

  // Parallel: user playlists + track count + all artist/thumbnail data
  const [
    { data: playlists },
    { count: trackCount },
    { data: artistTrackRows },
  ] = await Promise.all([
    db.from("playlists").select("*").order("created_at", { ascending: false }),
    db.from("tracks").select("id", { count: "exact", head: true }).eq("status", "ready"),
    db.from("tracks").select("artist, thumbnail_url").eq("status", "ready").not("artist", "is", null),
  ]);

  // User playlist thumbs — one batch query instead of N individual fetches
  const playlistIds = (playlists ?? []).map(p => p.id);
  const thumbMap: Record<string, (string | null)[]> = {};
  if (playlistIds.length > 0) {
    const { data: ptRows } = await db
      .from("playlist_tracks")
      .select("playlist_id, position, tracks(thumbnail_url, status)")
      .in("playlist_id", playlistIds)
      .order("position");
    for (const row of ptRows ?? []) {
      const track = (Array.isArray(row.tracks) ? row.tracks[0] : row.tracks) as { thumbnail_url: string | null; status: string } | null;
      if (!track || track.status !== "ready") continue;
      const arr = thumbMap[row.playlist_id] ?? [];
      if (arr.length < 4) { arr.push(track.thumbnail_url ?? null); thumbMap[row.playlist_id] = arr; }
    }
  }
  const userWithThumbs = (playlists ?? []).map(p => ({ ...p, thumbs: thumbMap[p.id] ?? [] }));

  // Smart playlist thumbs — 3 small parallel queries
  const [
    { data: allThumbs },
    { data: recentThumbs },
    { data: topThumbs },
  ] = await Promise.all([
    db.from("tracks").select("thumbnail_url").eq("status", "ready").order("title").limit(4),
    db.from("tracks").select("thumbnail_url").eq("status", "ready").order("added_at", { ascending: false }).limit(4),
    db.from("tracks").select("thumbnail_url").eq("status", "ready").gt("played_count", 0).order("played_count", { ascending: false }).limit(4),
  ]);

  const smart = [
    { id: "smart:all", name: "All songs", smart: true, thumbs: toArr(allThumbs) },
    { id: "smart:recent", name: "Recently added", smart: true, thumbs: toArr(recentThumbs) },
    { id: "smart:most-played", name: "Most played", smart: true, thumbs: toArr(topThumbs) },
  ];

  // Artist playlists — built from already-fetched artistTrackRows, no extra query
  const artistMap = new Map<string, { freq: Map<string, number>; thumbs: (string | null)[] }>();
  for (const row of artistTrackRows ?? []) {
    const raw = (row.artist as string | null)?.trim().replace(/\s+/g, " ");
    if (!raw) continue;
    const key = raw.toLowerCase().normalize("NFC");
    if (!artistMap.has(key)) artistMap.set(key, { freq: new Map(), thumbs: [] });
    const entry = artistMap.get(key)!;
    entry.freq.set(raw, (entry.freq.get(raw) ?? 0) + 1);
    if (entry.thumbs.length < 4 && row.thumbnail_url) entry.thumbs.push(row.thumbnail_url);
  }
  const artistPlaylists = [...artistMap.entries()]
    .map(([key, { freq, thumbs }]) => {
      const displayName = [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
      return { id: `smart:artist:${key}`, name: displayName, smart: true, thumbs };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  return NextResponse.json({ playlists: userWithThumbs, smart, artists: artistPlaylists, trackCount: trackCount ?? 0 });
}

export async function POST(req: NextRequest) {
  const denied = await requireAuth(req); if (denied) return denied;
  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const db = getServiceClient();
  const { data, error } = await db.from("playlists").insert({
    name: body.data.name, description: body.data.description ?? null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ playlist: data });
}
