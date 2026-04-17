// src/app/api/playlists/[id]/tracks/[tid]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getServiceClient } from "@/lib/db";

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string; tid: string }> }) {
  const denied = await requireAuth(req); if (denied) return denied;
  const { id, tid } = await ctx.params;
  const db = getServiceClient();
  await db.from("playlist_tracks").delete().eq("playlist_id", id).eq("track_id", tid);
  return NextResponse.json({ ok: true });
}
