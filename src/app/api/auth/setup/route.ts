import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServiceClient } from "@/lib/db";
import { hashPattern, isValidPattern } from "@/lib/pattern";
import { signSession, sessionHash } from "@/lib/session";

const Body = z.object({ pattern: z.array(z.number().int().min(0).max(8)).min(4) });

export async function POST(req: NextRequest) {
  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  if (!isValidPattern(body.data.pattern)) {
    return NextResponse.json({ error: "invalid pattern" }, { status: 400 });
  }

  const db = getServiceClient();
  const { count } = await db.from("users").select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) return NextResponse.json({ error: "already configured" }, { status: 409 });

  const hash = await hashPattern(body.data.pattern);
  const { error } = await db.from("users").insert({ pattern_hash: hash });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const expiresInSec = 30 * 24 * 60 * 60;
  const sessionId = crypto.randomUUID();
  const token = await signSession(sessionId, expiresInSec);
  await db.from("sessions").insert({
    id: sessionId,
    token_hash: sessionHash(token),
    expires_at: new Date(Date.now() + expiresInSec * 1000).toISOString(),
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("session", token, {
    httpOnly: true, secure: true, sameSite: "lax", maxAge: expiresInSec, path: "/",
  });
  return res;
}
