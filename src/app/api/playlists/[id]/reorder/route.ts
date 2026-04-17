// src/app/api/playlists/[id]/reorder/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { getServiceClient } from "@/lib/db";

const Body = z.object({ order: z.array(z.string().uuid()) });

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAuth(req); if (denied) return denied;
  const { id } = await ctx.params;
  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const db = getServiceClient();
  const results = await Promise.all(
    body.data.order.map((trackId, i) =>
      db.from("playlist_tracks").update({ position: i })
        .eq("playlist_id", id).eq("track_id", trackId)
    )
  );
  const failed = results.find(r => r.error);
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
