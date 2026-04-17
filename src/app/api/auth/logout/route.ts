import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db";
import { sessionHash, verifySession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (token) {
    const payload = await verifySession(token);
    const db = getServiceClient();
    if (payload) await db.from("sessions").delete().eq("id", payload.sid);
    await db.from("sessions").delete().eq("token_hash", sessionHash(token));
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("session");
  return res;
}
