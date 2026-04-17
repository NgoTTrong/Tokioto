import { NextRequest, NextResponse } from "next/server";
import { sessionHash, verifySession } from "./session";
import { getServiceClient } from "./db";

export async function requireAuth(req: NextRequest): Promise<NextResponse | null> {
  const token = req.cookies.get("session")?.value;
  const payload = token ? await verifySession(token) : null;
  if (!payload) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = getServiceClient();
  const { data } = await db.from("sessions")
    .select("id, expires_at").eq("id", payload.sid).eq("token_hash", sessionHash(token!)).maybeSingle();
  if (!data || new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
