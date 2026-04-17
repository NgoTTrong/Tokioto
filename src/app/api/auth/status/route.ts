import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db";

export async function GET() {
  const db = getServiceClient();
  const { count } = await db.from("users").select("id", { count: "exact", head: true });
  return NextResponse.json({ needsSetup: (count ?? 0) === 0 });
}
