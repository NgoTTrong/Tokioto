import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServiceClient } from "@/lib/db";
import { hashPattern, isValidPattern } from "@/lib/pattern";
import { requireAuth } from "@/lib/require-auth";

const Body = z.object({ pattern: z.array(z.number().int().min(0).max(8)).min(4) });

export async function POST(req: NextRequest) {
  const denied = await requireAuth(req);
  if (denied) return denied;

  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  if (!isValidPattern(body.data.pattern)) {
    return NextResponse.json({ error: "invalid pattern" }, { status: 400 });
  }

  const db = getServiceClient();
  const { data: users } = await db.from("users").select("id").limit(1);
  if (!users?.length) return NextResponse.json({ error: "no user found" }, { status: 404 });

  const hash = await hashPattern(body.data.pattern);
  const { error } = await db.from("users").update({ pattern_hash: hash }).eq("id", users[0].id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
