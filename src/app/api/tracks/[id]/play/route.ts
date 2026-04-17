// src/app/api/tracks/[id]/play/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getServiceClient } from "@/lib/db";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAuth(req); if (denied) return denied;
  const { id } = await ctx.params;
  const db = getServiceClient();
  await db.rpc("increment_play", { p_track_id: id });
  return NextResponse.json({ ok: true });
}
