// src/app/api/playlists/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { getServiceClient } from "@/lib/db";

const Body = z.object({ name: z.string().min(1), description: z.string().nullable().optional() });

export async function GET(req: NextRequest) {
  const denied = await requireAuth(req); if (denied) return denied;
  const db = getServiceClient();
  const { data } = await db.from("playlists").select("*").order("created_at", { ascending: false });
  const { count: trackCount } = await db.from("tracks").select("id", { count: "exact", head: true }).eq("status", "ready");
  const { data: artistRows } = await db.from("tracks").select("artist").eq("status", "ready").not("artist", "is", null);
  const artists = [...new Set((artistRows ?? []).map(r => r.artist as string).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const smart = [
    { id: "smart:all", name: "All songs", smart: true, count: trackCount ?? 0 },
    { id: "smart:recent", name: "Recently added", smart: true },
    { id: "smart:most-played", name: "Most played", smart: true },
  ];
  const artistPlaylists = artists.map(a => ({ id: `smart:artist:${a}`, name: a, smart: true }));
  return NextResponse.json({ playlists: data ?? [], smart, artists: artistPlaylists });
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
