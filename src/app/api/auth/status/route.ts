import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db";
import { sessionHash, verifySession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const db = getServiceClient();
  const { count } = await db.from("users").select("id", { count: "exact", head: true });
  const needsSetup = (count ?? 0) === 0;

  let isLoggedIn = false;
  const token = req.cookies.get("session")?.value;
  if (token) {
    const payload = await verifySession(token);
    if (payload) {
      const { data } = await db.from("sessions")
        .select("id, expires_at").eq("id", payload.sid).eq("token_hash", sessionHash(token)).maybeSingle();
      isLoggedIn = !!data && new Date(data.expires_at) > new Date();
    }
  }

  return NextResponse.json({ needsSetup, isLoggedIn });
}
