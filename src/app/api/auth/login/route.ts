import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServiceClient } from "@/lib/db";
import { verifyPattern } from "@/lib/pattern";
import { signSession, sessionHash } from "@/lib/session";

const Body = z.object({ pattern: z.array(z.number().int().min(0).max(8)).min(4) });

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad body" }, { status: 400 });

  const db = getServiceClient();
  const { data: user } = await db.from("users").select("*").limit(1).maybeSingle();
  if (!user) return NextResponse.json({ error: "no user" }, { status: 404 });

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return NextResponse.json({ error: "locked", until: user.locked_until }, { status: 423 });
  }

  const ok = await verifyPattern(parsed.data.pattern, user.pattern_hash);
  if (!ok) {
    const next = user.failed_attempts + 1;
    const patch: Record<string, unknown> = next >= 5
      ? { failed_attempts: 0, locked_until: new Date(Date.now() + 5 * 60 * 1000).toISOString() }
      : { failed_attempts: next };
    await db.from("users").update(patch).eq("id", user.id);
    return NextResponse.json({ error: "wrong pattern" }, { status: 401 });
  }

  await db.from("users").update({ failed_attempts: 0, locked_until: null }).eq("id", user.id);

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
