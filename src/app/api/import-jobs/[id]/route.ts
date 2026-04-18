import { requireAuth } from "@/lib/require-auth";
import { getServiceClient } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAuth(req);
  if (authErr) return authErr;

  const { id } = await ctx.params;
  const db = getServiceClient();

  const { data: job } = await db
    .from("import_jobs")
    .select("track_id, status")
    .eq("id", id)
    .maybeSingle();

  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.from("import_jobs").delete().eq("id", id);

  if (job.status === "queued" || job.status === "running") {
    await db.from("tracks").delete().eq("id", job.track_id);
  }

  return NextResponse.json({ ok: true });
}
