// src/app/api/playlists/[id]/tracks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { getServiceClient } from "@/lib/db";

const Body = z.object({ track_id: z.string().uuid() });

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAuth(req); if (denied) return denied;
  const { id } = await ctx.params;
  if (id.startsWith("smart:")) return NextResponse.json({ error: "read only" }, { status: 400 });
  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const db = getServiceClient();
  const { data: pl } = await db.from("playlists").select("id").eq("id", id).maybeSingle();
  if (!pl) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { data: last } = await db.from("playlist_tracks").select("position")
    .eq("playlist_id", id).order("position", { ascending: false }).limit(1).maybeSingle();
  const pos = (last?.position ?? -1) + 1;
  const { error } = await db.from("playlist_tracks").insert({
    playlist_id: id, track_id: body.data.track_id, position: pos,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
