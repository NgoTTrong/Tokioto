// src/app/api/tracks/preview/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { parseSourceUrl } from "@/lib/url-parser";
import { fetchPreview } from "@/lib/oembed";

const Body = z.object({ url: z.string().url() });

export async function POST(req: NextRequest) {
  const denied = await requireAuth(req); if (denied) return denied;
  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const parsed = parseSourceUrl(body.data.url);
  if (!parsed) return NextResponse.json({ error: "unsupported url" }, { status: 400 });
  const preview = await fetchPreview(parsed);
  if (!preview) return NextResponse.json({ error: "preview failed" }, { status: 502 });
  return NextResponse.json({ ...preview, source: parsed.source, source_id: parsed.id, source_url: parsed.url });
}
