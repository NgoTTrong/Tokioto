// src/app/api/playlists/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { getServiceClient } from "@/lib/db";

const Patch = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  thumbnail_url: z.string().url().nullable().optional(),
});

async function resolveSmart(id: string) {
  const db = getServiceClient();
  const q = db.from("tracks").select("*").eq("status", "ready");
  if (id === "smart:all") return (await q.order("title")).data ?? [];
  if (id === "smart:recent") return (await q.order("added_at", { ascending: false }).limit(50)).data ?? [];
  if (id === "smart:most-played") return (await q.gt("played_count", 0).order("played_count", { ascending: false }).limit(50)).data ?? [];
  return null;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAuth(req); if (denied) return denied;
  const { id: rawId } = await ctx.params;
  const id = decodeURIComponent(rawId);
  if (id.startsWith("smart:")) {
    const tracks = await resolveSmart(id);
    if (tracks === null) return NextResponse.json({ error: "not found" }, { status: 404 });
    const SMART_NAMES: Record<string, string> = {
      "smart:all": "All songs",
      "smart:recent": "Recently added",
      "smart:most-played": "Most played",
    };
    return NextResponse.json({ playlist: { id, name: SMART_NAMES[id] ?? id, smart: true }, tracks });
  }
  const db = getServiceClient();
  const { data: pl } = await db.from("playlists").select("*").eq("id", id).maybeSingle();
  if (!pl) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { data: rows } = await db.from("playlist_tracks")
    .select("position, track:tracks(*)").eq("playlist_id", id).order("position");
  return NextResponse.json({ playlist: pl, tracks: (rows ?? []).map(r => r.track) });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAuth(req); if (denied) return denied;
  const { id: rawId } = await ctx.params;
  const id = decodeURIComponent(rawId);
  if (id.startsWith("smart:")) return NextResponse.json({ error: "read only" }, { status: 400 });
  const body = Patch.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const db = getServiceClient();
  const { data: existing } = await db.from("playlists").select("id").eq("id", id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { data, error } = await db.from("playlists").update(body.data).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ playlist: data });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAuth(req); if (denied) return denied;
  const { id: rawId } = await ctx.params;
  const id = decodeURIComponent(rawId);
  if (id.startsWith("smart:")) return NextResponse.json({ error: "read only" }, { status: 400 });
  const db = getServiceClient();
  const { data: pl } = await db.from("playlists").select("id").eq("id", id).maybeSingle();
  if (!pl) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { error } = await db.from("playlists").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
