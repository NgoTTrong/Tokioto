import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/session";

const PUBLIC_PATHS = ["/login", "/setup", "/api/auth/login", "/api/auth/setup", "/api/auth/status", "/api/cron/"];

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (PUBLIC_PATHS.some((p) => path.startsWith(p))) return NextResponse.next();
  if (path.startsWith("/_next") || path.startsWith("/favicon") || path === "/manifest.json") {
    return NextResponse.next();
  }

  // Note: proxy only validates JWT signature (fast path).
  // Full session revocation (DB check) is enforced per-handler via requireAuth().
  // Every API route handler MUST call requireAuth() — proxy alone is not enough.
  const token = req.cookies.get("session")?.value;
  const payload = token ? await verifySession(token) : null;
  if (!payload) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
