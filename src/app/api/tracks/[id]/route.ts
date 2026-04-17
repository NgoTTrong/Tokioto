// src/app/api/tracks/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { getServiceClient } from "@/lib/db";
import { buildR2Key, deleteObject } from "@/lib/r2";

const Patch = z.object({
  title: z.string().min(1).optional(),
  artist: z.string().nullable().optional(),
  thumbnail_url: z.string().url().nullable().optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAuth(req); if (denied) return denied;
  const { id } = await ctx.params;
  const body = Patch.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const db = getServiceClient();
  const { data, error } = await db.from("tracks").update(body.data).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ track: data });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAuth(req); if (denied) return denied;
  const { id } = await ctx.params;
  const db = getServiceClient();
  const { data: track } = await db.from("tracks").select("r2_key").eq("id", id).maybeSingle();
  if (!track) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (track.r2_key) {
    try { await deleteObject(track.r2_key); } catch (e) { console.error("R2 delete audio failed", id, e); }
    try { await deleteObject(buildR2Key("thumbnail", id)); } catch (e) { console.error("R2 delete thumbnail failed", id, e); }
  }
  await db.from("tracks").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
