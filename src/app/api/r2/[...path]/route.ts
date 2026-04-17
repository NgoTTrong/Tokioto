import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { presignUrl } from "@/lib/r2";

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const denied = await requireAuth(req); if (denied) return denied;
  const { path } = await ctx.params;
  const key = path.join("/");
  const url = await presignUrl(key, 600);
  return NextResponse.redirect(url, { status: 302 });
}
