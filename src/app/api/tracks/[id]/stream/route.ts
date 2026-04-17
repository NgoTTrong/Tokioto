// src/app/api/tracks/[id]/stream/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getServiceClient } from "@/lib/db";
import { presignUrl } from "@/lib/r2";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAuth(req); if (denied) return denied;
  const { id } = await ctx.params;
  const db = getServiceClient();
  const { data } = await db.from("tracks").select("r2_key, status").eq("id", id).maybeSingle();
  if (!data || data.status !== "ready" || !data.r2_key) {
    return NextResponse.json({ error: "not ready" }, { status: 404 });
  }
  const url = await presignUrl(data.r2_key, 3600);
  return NextResponse.redirect(url, { status: 302 });
}
