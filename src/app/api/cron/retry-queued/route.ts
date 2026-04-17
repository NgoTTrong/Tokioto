import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db";
import { dispatchJob } from "@/lib/worker-client";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = getServiceClient();
  const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data: jobs, error } = await db.from("import_jobs")
    .select("*").eq("status", "queued").lt("created_at", cutoff).limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  for (const j of jobs ?? []) {
    try { await dispatchJob({ job_id: j.id, track_id: j.track_id, source_url: j.source_url }); } catch {}
  }
  return NextResponse.json({ retried: jobs?.length ?? 0 });
}
