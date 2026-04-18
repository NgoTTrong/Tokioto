// src/app/api/tracks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { getServiceClient } from "@/lib/db";
import { parseSourceUrl } from "@/lib/url-parser";
import { dispatchJob } from "@/lib/worker-client";

const Body = z.object({
  url: z.string().url(),
  title: z.string().min(1),
  artist: z.string().nullable().optional(),
  thumbnail_url: z.string().url().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const denied = await requireAuth(req); if (denied) return denied;
  const sp = req.nextUrl.searchParams;
  const limit = Math.min(parseInt(sp.get("limit") || "100", 10), 500);
  const order = sp.get("order") || "added_at.desc";
  const [col, dir] = order.split(".");
  const ALLOWED_ORDER_COLS = new Set(["added_at", "played_count", "title", "last_played_at"]);
  if (!ALLOWED_ORDER_COLS.has(col)) return NextResponse.json({ error: "bad order" }, { status: 400 });
  const db = getServiceClient();
  const { data, error } = await db.from("tracks").select("*")
    .eq("status", "ready").order(col, { ascending: dir === "asc" }).limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tracks: data });
}

export async function POST(req: NextRequest) {
  const denied = await requireAuth(req); if (denied) return denied;
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad body" }, { status: 400 });

  const src = parseSourceUrl(parsed.data.url);
  if (!src) return NextResponse.json({ error: "unsupported url" }, { status: 400 });

  const db = getServiceClient();

  const { data: existing } = await db.from("tracks").select("*")
    .eq("source", src.source).eq("source_id", src.id).maybeSingle();
  if (existing) {
    if (existing.status === "ready") return NextResponse.json({ track: existing, alreadyExists: true });
    // Track stuck (pending/failed with no active job) — create a new job and dispatch
    const { data: job } = await db.from("import_jobs").insert({
      track_id: existing.id, source_url: src.url, status: "queued",
    }).select().single();
    if (job) {
      await db.from("tracks").update({ status: "pending" }).eq("id", existing.id);
      try { await dispatchJob({ job_id: job.id, track_id: existing.id, source_url: src.url }); } catch (e) { console.error("[tracks] dispatch failed:", e); }
    }
    return NextResponse.json({ track: existing });
  }

  const { data: track, error } = await db.from("tracks").insert({
    source: src.source, source_url: src.url, source_id: src.id,
    title: parsed.data.title, artist: parsed.data.artist ?? null,
    thumbnail_url: parsed.data.thumbnail_url ?? null, status: "pending",
  }).select().single();
  if (error || !track) return NextResponse.json({ error: error?.message }, { status: 500 });

  const { data: job, error: jobError } = await db.from("import_jobs").insert({
    track_id: track.id, source_url: src.url, status: "queued",
  }).select().single();
  if (jobError || !job) return NextResponse.json({ error: jobError?.message ?? "job insert failed" }, { status: 500 });

  try {
    await dispatchJob({ job_id: job.id, track_id: track.id, source_url: src.url });
  } catch (e) {
    console.error("[tracks] dispatch failed:", e);
  }
  return NextResponse.json({ track });
}
