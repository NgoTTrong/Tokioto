import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getServiceClient } from "@/lib/db";
import { dispatchJob } from "@/lib/worker-client";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAuth(req); if (denied) return denied;
  const { id } = await ctx.params;
  const db = getServiceClient();
  const { data: job, error: fetchError } = await db.from("import_jobs").select("*").eq("id", id).maybeSingle();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { error: updateJobError } = await db.from("import_jobs").update({ status: "queued", error_message: null, finished_at: null }).eq("id", id);
  if (updateJobError) return NextResponse.json({ error: updateJobError.message }, { status: 500 });
  const { error: updateTrackError } = await db.from("tracks").update({ status: "pending", error_message: null }).eq("id", job.track_id);
  if (updateTrackError) return NextResponse.json({ error: updateTrackError.message }, { status: 500 });
  try { await dispatchJob({ job_id: id, track_id: job.track_id, source_url: job.source_url }); } catch {}
  return NextResponse.json({ ok: true });
}
