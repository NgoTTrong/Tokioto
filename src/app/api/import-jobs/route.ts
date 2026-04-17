import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getServiceClient } from "@/lib/db";

export async function GET(req: NextRequest) {
  const denied = await requireAuth(req); if (denied) return denied;
  const db = getServiceClient();
  const { data, error } = await db.from("import_jobs")
    .select("*, track:tracks(id, title, artist, thumbnail_url, status)")
    .order("created_at", { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ jobs: data ?? [] });
}
