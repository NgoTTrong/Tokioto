# Tokioto Music Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-user personal music web app that imports audio from YouTube/SoundCloud, plays it through a vinyl-style player with mobile background + offline support, and gates access behind a 9-dot pattern login.

**Architecture:** Next.js 15 on Vercel handles frontend + CRUD API + auth. Supabase stores metadata. A Python FastAPI worker on Google Cloud Run runs yt-dlp to extract audio, uploads mp3s to Cloudflare R2, and writes status back to Supabase. Client streams audio via short-lived R2 pre-signed URLs; a PWA service worker + Media Session API enables lock-screen playback; manual per-playlist caching via Cache API provides offline.

**Tech Stack:** Next.js 15 (App Router, TS), Tailwind CSS, Supabase (Postgres), Cloudflare R2, Cloud Run (Python 3.12 + FastAPI + yt-dlp + ffmpeg + colorthief), pnpm, Vitest, Playwright, pytest.

**Spec:** `docs/superpowers/specs/2026-04-17-tokioto-music-web-design.md`

---

## Milestones

1. Foundation — project scaffold, git, env, Supabase migrations
2. Auth — pattern lock + session
3. Shared libs — R2, oEmbed, URL parser, worker client
4. Tracks API
5. Playlists API
6. Import jobs API + cron
7. Python worker (Cloud Run)
8. UI shell & navigation
9. Library & Import pages
10. Playlists pages
11. Player & Media Session
12. PWA & Offline cache
13. E2E tests
14. Deployment configs

**After each milestone, the app should run and the newly added functionality should be manually verifiable.**

---

## Milestone 1 — Foundation

### Task 1.1: Initialize Next.js project with pnpm

**Files:** Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `.gitignore`

- [ ] **Step 1: Scaffold**

```bash
cd /e/Personal/Tokioto
pnpm create next-app@latest . --typescript --tailwind --app --src-dir --eslint --no-turbopack --import-alias "@/*"
```

Answer prompts with defaults; accept "Yes" for ESLint and TypeScript, "No" for Turbopack (more stable).

- [ ] **Step 2: Verify dev server boots**

```bash
pnpm dev
```

Open `http://localhost:3000`. Expected: Next.js welcome page renders. Kill with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold Next.js + Tailwind + TypeScript with pnpm"
```

### Task 1.2: Add .gitignore entries and commit spec/plan

**Files:** Modify: `.gitignore`

- [ ] **Step 1: Append project-specific ignores**

Append to `.gitignore`:
```
.superpowers/
.env
.env.local
.env.*.local
supabase/.temp/
*.log
```

- [ ] **Step 2: Commit spec, plan, and gitignore**

```bash
git add .gitignore docs/
git commit -m "docs: add design spec and implementation plan"
```

### Task 1.3: Create env example file

**Files:** Create: `.env.local.example`, `.env.local`

- [ ] **Step 1: Write `.env.local.example`**

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=

# Session (generate with: openssl rand -base64 48)
SESSION_SECRET=

# R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=tokioto
R2_PUBLIC_BASE=

# Worker
WORKER_URL=
WORKER_SECRET=

# Cron (Vercel Cron)
CRON_SECRET=
```

- [ ] **Step 2: Copy to `.env.local` and leave empty for now**

```bash
cp .env.local.example .env.local
```

- [ ] **Step 3: Commit example only**

```bash
git add .env.local.example
git commit -m "chore: add env variable template"
```

### Task 1.4: Install core dependencies

**Files:** Modify: `package.json`

- [ ] **Step 1: Install runtime deps**

```bash
pnpm add @supabase/supabase-js bcryptjs jsonwebtoken @aws-sdk/client-s3 @aws-sdk/s3-request-presigner zod
```

- [ ] **Step 2: Install dev deps**

```bash
pnpm add -D @types/bcryptjs @types/jsonwebtoken vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom supabase
```

- [ ] **Step 3: Add Vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
```

Create `tests/setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Add test script**

Edit `package.json` `scripts` to add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts tests/setup.ts
git commit -m "chore: install core deps and configure Vitest"
```

### Task 1.5: Initialize Supabase local project

**Files:** Create: `supabase/config.toml`

- [ ] **Step 1: Init supabase**

```bash
pnpm dlx supabase init
```

- [ ] **Step 2: Ensure `supabase` is in pnpm bin**

```bash
pnpm supabase --version
```

Expected: prints version.

- [ ] **Step 3: Commit**

```bash
git add supabase/
git commit -m "chore: init Supabase project"
```

### Task 1.6: Create DB migrations

**Files:** Create: `supabase/migrations/20260417000001_init.sql`

- [ ] **Step 1: Write migration**

```sql
-- supabase/migrations/20260417000001_init.sql

create extension if not exists pgcrypto;

create table users (
  id uuid primary key default gen_random_uuid(),
  pattern_hash text not null,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);

create table tracks (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('youtube','soundcloud')),
  source_url text,
  source_id text,
  title text not null,
  artist text,
  duration_sec int,
  thumbnail_url text,
  r2_key text,
  accent_color text,
  status text not null check (status in ('pending','processing','ready','failed')),
  error_message text,
  added_at timestamptz not null default now(),
  played_count int not null default 0,
  last_played_at timestamptz,
  unique (source, source_id)
);

create index tracks_added_at_idx on tracks (added_at desc);
create index tracks_played_count_idx on tracks (played_count desc);

create table playlists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  thumbnail_url text,
  created_at timestamptz not null default now()
);

create table playlist_tracks (
  playlist_id uuid references playlists(id) on delete cascade,
  track_id uuid references tracks(id) on delete cascade,
  position int not null,
  added_at timestamptz not null default now(),
  primary key (playlist_id, track_id)
);

create index playlist_tracks_order on playlist_tracks (playlist_id, position);

create table import_jobs (
  id uuid primary key default gen_random_uuid(),
  track_id uuid references tracks(id) on delete cascade,
  source_url text not null,
  status text not null check (status in ('queued','running','done','failed')),
  error_message text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index import_jobs_status_idx on import_jobs (status, created_at);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index sessions_token_hash_idx on sessions (token_hash);
```

- [ ] **Step 2: Start local Supabase and apply**

```bash
pnpm supabase start
pnpm supabase db reset
```

Expected: tables created; `supabase status` prints local URL and anon/service keys.

- [ ] **Step 3: Copy local keys into `.env.local`**

Run `pnpm supabase status` and fill `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` in `.env.local`.

- [ ] **Step 4: Commit migration**

```bash
git add supabase/migrations/
git commit -m "feat(db): initial schema for users, tracks, playlists, jobs, sessions"
```

---

## Milestone 2 — Auth

### Task 2.1: Pattern normalization utility (TDD)

**Files:** Create: `src/lib/pattern.ts`, `tests/pattern.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/pattern.test.ts
import { describe, it, expect } from "vitest";
import { normalizePattern, isValidPattern } from "@/lib/pattern";

describe("normalizePattern", () => {
  it("joins indices with dashes", () => {
    expect(normalizePattern([0, 1, 2, 5, 8])).toBe("0-1-2-5-8");
  });
  it("throws if fewer than 4 dots", () => {
    expect(() => normalizePattern([0, 1, 2])).toThrow();
  });
  it("throws on duplicate dots", () => {
    expect(() => normalizePattern([0, 1, 1, 2])).toThrow();
  });
  it("throws on out-of-range index", () => {
    expect(() => normalizePattern([0, 1, 2, 9])).toThrow();
  });
});

describe("isValidPattern", () => {
  it("rejects sequences that skip a dot in a straight line", () => {
    // 0 to 2 horizontally skips 1; invalid unless 1 already in sequence
    expect(isValidPattern([0, 2, 4, 6])).toBe(false);
  });
  it("accepts when middle dot already consumed", () => {
    expect(isValidPattern([1, 0, 2, 4])).toBe(true);
  });
  it("accepts diagonal skip (0→4) because 2 is not between linearly", () => {
    expect(isValidPattern([0, 4, 8, 3])).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect fail**

```bash
pnpm test tests/pattern.test.ts
```

Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/pattern.ts
export function normalizePattern(seq: number[]): string {
  if (seq.length < 4) throw new Error("Pattern must connect at least 4 dots");
  const set = new Set<number>();
  for (const n of seq) {
    if (!Number.isInteger(n) || n < 0 || n > 8) throw new Error("Invalid dot");
    if (set.has(n)) throw new Error("Duplicate dot");
    set.add(n);
  }
  return seq.join("-");
}

// Middle dot between (a,b) on the 3x3 grid, or null if path isn't straight-through a middle.
const MIDDLE: Record<string, number> = {
  "0-2": 1, "2-0": 1,
  "3-5": 4, "5-3": 4,
  "6-8": 7, "8-6": 7,
  "0-6": 3, "6-0": 3,
  "1-7": 4, "7-1": 4,
  "2-8": 5, "8-2": 5,
  "0-8": 4, "8-0": 4,
  "2-6": 4, "6-2": 4,
};

export function isValidPattern(seq: number[]): boolean {
  try { normalizePattern(seq); } catch { return false; }
  const seen = new Set<number>();
  for (let i = 0; i < seq.length; i++) {
    const curr = seq[i];
    if (i > 0) {
      const mid = MIDDLE[`${seq[i - 1]}-${curr}`];
      if (mid !== undefined && !seen.has(mid)) return false;
    }
    seen.add(curr);
  }
  return true;
}
```

- [ ] **Step 4: Run — expect pass**

```bash
pnpm test tests/pattern.test.ts
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pattern.ts tests/pattern.test.ts
git commit -m "feat(auth): pattern normalization + validation with line-through rule"
```

### Task 2.2: Pattern hash wrapper (TDD)

**Files:** Modify: `src/lib/pattern.ts`; Create: `tests/pattern-hash.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/pattern-hash.test.ts
import { describe, it, expect } from "vitest";
import { hashPattern, verifyPattern } from "@/lib/pattern";

describe("pattern hash", () => {
  it("hashes a pattern and verifies it", async () => {
    const hash = await hashPattern([0, 1, 2, 5, 8]);
    expect(await verifyPattern([0, 1, 2, 5, 8], hash)).toBe(true);
    expect(await verifyPattern([0, 1, 2, 5], hash)).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement** (append to `src/lib/pattern.ts`)

```ts
import bcrypt from "bcryptjs";

export async function hashPattern(seq: number[]): Promise<string> {
  return bcrypt.hash(normalizePattern(seq), 12);
}

export async function verifyPattern(seq: number[], hash: string): Promise<boolean> {
  try {
    const normalized = normalizePattern(seq);
    return await bcrypt.compare(normalized, hash);
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add src/lib/pattern.ts tests/pattern-hash.test.ts
git commit -m "feat(auth): bcrypt hash + verify helpers"
```

### Task 2.3: Supabase server client

**Files:** Create: `src/lib/db.ts`

- [ ] **Step 1: Implement**

```ts
// src/lib/db.ts
import { createClient } from "@supabase/supabase-js";

export function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/db.ts
git commit -m "feat(db): service-role Supabase client factory"
```

### Task 2.4: Session JWT helper (TDD)

**Files:** Create: `src/lib/session.ts`, `tests/session.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/session.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { signSession, verifySession, sessionHash } from "@/lib/session";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-test-secret-test-secret-test-secret";
});

describe("session", () => {
  it("signs and verifies a token", async () => {
    const token = await signSession("sid-123", 60 * 60);
    const payload = await verifySession(token);
    expect(payload?.sid).toBe("sid-123");
  });
  it("rejects tampered token", async () => {
    const token = await signSession("sid-123", 60);
    const bad = token.slice(0, -2) + "xx";
    expect(await verifySession(bad)).toBeNull();
  });
  it("produces stable sha256 hash", () => {
    expect(sessionHash("abc")).toBe(sessionHash("abc"));
    expect(sessionHash("abc")).not.toBe(sessionHash("abd"));
  });
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement**

```ts
// src/lib/session.ts
import jwt from "jsonwebtoken";
import crypto from "node:crypto";

export type SessionPayload = { sid: string };

export function signSession(sid: string, expiresInSeconds: number): Promise<string> {
  return new Promise((resolve, reject) => {
    jwt.sign({ sid }, process.env.SESSION_SECRET!, { expiresIn: expiresInSeconds }, (err, token) => {
      if (err || !token) reject(err); else resolve(token);
    });
  });
}

export function verifySession(token: string): Promise<SessionPayload | null> {
  return new Promise((resolve) => {
    jwt.verify(token, process.env.SESSION_SECRET!, (err, decoded) => {
      if (err || !decoded) return resolve(null);
      resolve(decoded as SessionPayload);
    });
  });
}

export function sessionHash(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add src/lib/session.ts tests/session.test.ts
git commit -m "feat(auth): JWT session sign/verify + sha256 hash helper"
```

### Task 2.5: Auth middleware

**Files:** Create: `src/middleware.ts`

- [ ] **Step 1: Implement**

```ts
// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/session";

const PUBLIC_PATHS = ["/login", "/setup", "/api/auth/login", "/api/auth/setup", "/api/cron/"];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (PUBLIC_PATHS.some((p) => path.startsWith(p))) return NextResponse.next();
  if (path.startsWith("/_next") || path.startsWith("/favicon") || path === "/manifest.json") {
    return NextResponse.next();
  }

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
```

- [ ] **Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(auth): route middleware guarding non-public paths"
```

### Task 2.6: `/api/auth/setup` route

**Files:** Create: `src/app/api/auth/setup/route.ts`

- [ ] **Step 1: Implement**

```ts
// src/app/api/auth/setup/route.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/auth/setup/route.ts
git commit -m "feat(api): POST /api/auth/setup creates initial pattern"
```

### Task 2.7: `/api/auth/login` with rate limiting

**Files:** Create: `src/app/api/auth/login/route.ts`

- [ ] **Step 1: Implement**

```ts
// src/app/api/auth/login/route.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/auth/login/route.ts
git commit -m "feat(api): POST /api/auth/login with lockout"
```

### Task 2.8: `/api/auth/logout` route

**Files:** Create: `src/app/api/auth/logout/route.ts`

- [ ] **Step 1: Implement**

```ts
// src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db";
import { sessionHash, verifySession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (token) {
    const payload = await verifySession(token);
    const db = getServiceClient();
    if (payload) await db.from("sessions").delete().eq("id", payload.sid);
    // Defensive: also delete by hash in case JWT was invalid but cookie exists
    await db.from("sessions").delete().eq("token_hash", sessionHash(token));
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("session");
  return res;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/auth/logout/route.ts
git commit -m "feat(api): POST /api/auth/logout revokes session"
```

### Task 2.9: PatternLock component

**Files:** Create: `src/components/Auth/PatternLock.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/Auth/PatternLock.tsx
"use client";
import { useRef, useState } from "react";

type Props = { onSubmit: (seq: number[]) => void; disabled?: boolean };

const DOT_COUNT = 9;
const GRID = 3;
const MIDDLE: Record<string, number> = {
  "0-2": 1, "2-0": 1, "3-5": 4, "5-3": 4, "6-8": 7, "8-6": 7,
  "0-6": 3, "6-0": 3, "1-7": 4, "7-1": 4, "2-8": 5, "8-2": 5,
  "0-8": 4, "8-0": 4, "2-6": 4, "6-2": 4,
};

export default function PatternLock({ onSubmit, disabled }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [seq, setSeq] = useState<number[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [ptr, setPtr] = useState<{ x: number; y: number } | null>(null);

  const dotPos = (i: number) => {
    const col = i % GRID, row = Math.floor(i / GRID);
    const step = 100;
    return { x: 50 + col * step, y: 50 + row * step };
  };

  const hitTest = (clientX: number, clientY: number): number | null => {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 300;
    const y = ((clientY - rect.top) / rect.height) * 300;
    for (let i = 0; i < DOT_COUNT; i++) {
      const p = dotPos(i);
      if ((x - p.x) ** 2 + (y - p.y) ** 2 < 30 ** 2) return i;
    }
    return null;
  };

  const addDot = (i: number) => {
    setSeq((prev) => {
      if (prev.includes(i)) return prev;
      if (prev.length > 0) {
        const mid = MIDDLE[`${prev[prev.length - 1]}-${i}`];
        if (mid !== undefined && !prev.includes(mid)) return [...prev, mid, i];
      }
      return [...prev, i];
    });
  };

  const start = (e: React.PointerEvent) => {
    if (disabled) return;
    const hit = hitTest(e.clientX, e.clientY);
    if (hit === null) return;
    setSeq([hit]);
    setDrawing(true);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing) return;
    const rect = svgRef.current!.getBoundingClientRect();
    setPtr({ x: ((e.clientX - rect.left) / rect.width) * 300, y: ((e.clientY - rect.top) / rect.height) * 300 });
    const hit = hitTest(e.clientX, e.clientY);
    if (hit !== null) addDot(hit);
  };
  const end = () => {
    if (!drawing) return;
    setDrawing(false);
    setPtr(null);
    if (seq.length >= 4) onSubmit(seq);
    setTimeout(() => setSeq([]), 400);
  };

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 300 300"
      className="w-64 h-64 touch-none select-none"
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {seq.map((idx, i) => {
        if (i === 0) return null;
        const a = dotPos(seq[i - 1]);
        const b = dotPos(idx);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="white" strokeWidth="4" opacity="0.8" />;
      })}
      {drawing && seq.length > 0 && ptr && (() => {
        const a = dotPos(seq[seq.length - 1]);
        return <line x1={a.x} y1={a.y} x2={ptr.x} y2={ptr.y} stroke="white" strokeWidth="3" opacity="0.4" />;
      })()}
      {Array.from({ length: DOT_COUNT }).map((_, i) => {
        const p = dotPos(i);
        const active = seq.includes(i);
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={active ? 14 : 10} fill={active ? "white" : "rgba(255,255,255,0.4)"} />
          </g>
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Auth/PatternLock.tsx
git commit -m "feat(ui): 9-dot PatternLock component with line-through rule"
```

### Task 2.10: `/setup` and `/login` pages

**Files:** Create: `src/app/setup/page.tsx`, `src/app/login/page.tsx`

- [ ] **Step 1: Implement setup page**

```tsx
// src/app/setup/page.tsx
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PatternLock from "@/components/Auth/PatternLock";

export default function Setup() {
  const [first, setFirst] = useState<number[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handle(seq: number[]) {
    setErr(null);
    if (!first) { setFirst(seq); return; }
    if (first.join(",") !== seq.join(",")) { setErr("Hai pattern không khớp. Thử lại."); setFirst(null); return; }
    setBusy(true);
    const r = await fetch("/api/auth/setup", { method: "POST", headers: {"content-type":"application/json"}, body: JSON.stringify({ pattern: seq }) });
    setBusy(false);
    if (r.ok) router.replace("/"); else setErr((await r.json()).error ?? "Lỗi");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-black text-white gap-4">
      <h1 className="text-xl font-semibold">{first ? "Vẽ lại để xác nhận" : "Tạo pattern mới"}</h1>
      <PatternLock onSubmit={handle} disabled={busy} />
      {err && <p className="text-red-400 text-sm">{err}</p>}
      <p className="text-xs opacity-60">Tối thiểu 4 điểm</p>
    </main>
  );
}
```

- [ ] **Step 2: Implement login page**

```tsx
// src/app/login/page.tsx
"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PatternLock from "@/components/Auth/PatternLock";

export default function Login() {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // If no user exists, redirect to setup
    fetch("/api/auth/status").then(r => r.json()).then(s => { if (s.needsSetup) router.replace("/setup"); }).catch(() => {});
  }, [router]);

  async function handle(seq: number[]) {
    setErr(null); setBusy(true);
    const r = await fetch("/api/auth/login", { method: "POST", headers: {"content-type":"application/json"}, body: JSON.stringify({ pattern: seq }) });
    setBusy(false);
    if (r.ok) router.replace("/");
    else {
      const body = await r.json().catch(() => ({}));
      if (r.status === 423) setErr(`Tài khoản bị khoá tới ${new Date(body.until).toLocaleTimeString()}`);
      else setErr("Pattern sai");
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-black text-white gap-4">
      <h1 className="text-xl font-semibold">Vẽ pattern để vào</h1>
      <PatternLock onSubmit={handle} disabled={busy} />
      {err && <p className="text-red-400 text-sm">{err}</p>}
    </main>
  );
}
```

- [ ] **Step 3: Add `/api/auth/status` helper**

```ts
// src/app/api/auth/status/route.ts
import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db";

export async function GET() {
  const db = getServiceClient();
  const { count } = await db.from("users").select("id", { count: "exact", head: true });
  return NextResponse.json({ needsSetup: (count ?? 0) === 0 });
}
```

Add `"/api/auth/status"` to `PUBLIC_PATHS` in `src/middleware.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/app/setup src/app/login src/app/api/auth/status src/middleware.ts
git commit -m "feat(ui): setup and login pages with PatternLock"
```

### Task 2.11: Reset-pattern CLI script

**Files:** Create: `scripts/reset-pattern.ts`

- [ ] **Step 1: Implement**

```ts
// scripts/reset-pattern.ts
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { createClient } from "@supabase/supabase-js";
import { hashPattern, isValidPattern } from "../src/lib/pattern.js";

async function main() {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const raw = await rl.question("New pattern (digits 0-8, no spaces, e.g. 01258): ");
  rl.close();
  const seq = [...raw.trim()].map((c) => parseInt(c, 10));
  if (!isValidPattern(seq)) { console.error("Invalid pattern"); process.exit(1); }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const db = createClient(url, key, { auth: { persistSession: false } });
  const hash = await hashPattern(seq);
  const { data: user } = await db.from("users").select("id").limit(1).maybeSingle();
  if (user) {
    await db.from("users").update({ pattern_hash: hash, failed_attempts: 0, locked_until: null }).eq("id", user.id);
  } else {
    await db.from("users").insert({ pattern_hash: hash });
  }
  await db.from("sessions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  console.log("Pattern updated. All sessions revoked.");
}
main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Add pnpm script**

In `package.json` `scripts`:
```json
"reset-pattern": "tsx scripts/reset-pattern.ts"
```

Install tsx:
```bash
pnpm add -D tsx dotenv
```

Prepend `reset-pattern` to load `.env.local`: change to `"reset-pattern": "tsx -r dotenv/config scripts/reset-pattern.ts dotenv_config_path=.env.local"`.

- [ ] **Step 3: Commit**

```bash
git add scripts/reset-pattern.ts package.json pnpm-lock.yaml
git commit -m "feat(tools): reset-pattern CLI"
```

### Milestone 2 manual check

Run `pnpm dev`, open `/login` → redirects to `/setup` (no user yet) → draw pattern twice → redirects to `/` (which still shows default Next.js page). Draw wrong pattern 5× to see lock. Run `pnpm reset-pattern` → enter a new pattern → confirm session is gone (must re-login).

---

## Milestone 3 — Shared libraries

### Task 3.1: R2 client + pre-sign (TDD with mocks)

**Files:** Create: `src/lib/r2.ts`, `tests/r2.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/r2.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { buildR2Key, presignUrl } from "@/lib/r2";

beforeAll(() => {
  process.env.R2_ACCOUNT_ID = "acc";
  process.env.R2_ACCESS_KEY_ID = "key";
  process.env.R2_SECRET_ACCESS_KEY = "secret";
  process.env.R2_BUCKET = "bkt";
});

describe("r2", () => {
  it("builds audio key", () => {
    expect(buildR2Key("audio", "abc-123")).toBe("audio/abc-123.mp3");
  });
  it("builds thumbnail key", () => {
    expect(buildR2Key("thumbnail", "abc-123")).toBe("thumbnails/abc-123.jpg");
  });
  it("produces a URL with signature parts", async () => {
    const url = await presignUrl("audio/x.mp3", 60);
    expect(url).toMatch(/X-Amz-Signature=/);
    expect(url).toMatch(/X-Amz-Expires=60/);
  });
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement**

```ts
// src/lib/r2.ts
import { S3Client, DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export function buildR2Key(kind: "audio" | "thumbnail", id: string): string {
  return kind === "audio" ? `audio/${id}.mp3` : `thumbnails/${id}.jpg`;
}

export async function presignUrl(key: string, expiresSec: number): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key });
  return getSignedUrl(client(), cmd, { expiresIn: expiresSec });
}

export async function deleteObject(key: string): Promise<void> {
  const cmd = new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key });
  await client().send(cmd);
}
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add src/lib/r2.ts tests/r2.test.ts
git commit -m "feat(r2): S3-compatible client + pre-sign helpers"
```

### Task 3.2: URL parser (TDD)

**Files:** Create: `src/lib/url-parser.ts`, `tests/url-parser.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/url-parser.test.ts
import { describe, it, expect } from "vitest";
import { parseSourceUrl } from "@/lib/url-parser";

describe("parseSourceUrl", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ", "youtube", "dQw4w9WgXcQ"],
    ["https://music.youtube.com/watch?v=dQw4w9WgXcQ&si=xyz", "youtube", "dQw4w9WgXcQ"],
    ["https://soundcloud.com/artist/track-name", "soundcloud", "artist/track-name"],
  ])("%s → %s/%s", (url, source, id) => {
    expect(parseSourceUrl(url)).toEqual({ source, id, url });
  });
  it("returns null for unsupported", () => {
    expect(parseSourceUrl("https://spotify.com/track/abc")).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement**

```ts
// src/lib/url-parser.ts
export type Parsed = { source: "youtube" | "soundcloud"; id: string; url: string };

export function parseSourceUrl(raw: string): Parsed | null {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  const host = u.hostname.replace(/^www\./, "");

  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    const id = u.searchParams.get("v");
    if (id) return { source: "youtube", id, url: raw };
  }
  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    if (id) return { source: "youtube", id, url: raw };
  }
  if (host === "soundcloud.com") {
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) return { source: "soundcloud", id: `${parts[0]}/${parts[1]}`, url: raw };
  }
  return null;
}
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add src/lib/url-parser.ts tests/url-parser.test.ts
git commit -m "feat(lib): YouTube + SoundCloud URL parser"
```

### Task 3.3: oEmbed metadata fetch (TDD with mocked fetch)

**Files:** Create: `src/lib/oembed.ts`, `tests/oembed.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/oembed.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchPreview } from "@/lib/oembed";

afterEach(() => vi.restoreAllMocks());

describe("fetchPreview", () => {
  it("parses YouTube oEmbed", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({
      title: "Never Gonna Give You Up", author_name: "Rick Astley", thumbnail_url: "https://img/yt.jpg",
    }), { headers: { "content-type": "application/json" } }));
    const r = await fetchPreview({ source: "youtube", id: "dQw4w9WgXcQ", url: "https://youtu.be/dQw4w9WgXcQ" });
    expect(r).toEqual({ title: "Never Gonna Give You Up", artist: "Rick Astley", thumbnail: "https://img/yt.jpg" });
  });
  it("parses SoundCloud oEmbed", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({
      title: "Lofi Beat", author_name: "ChillHop", thumbnail_url: "https://img/sc.jpg",
    }), { headers: { "content-type": "application/json" } }));
    const r = await fetchPreview({ source: "soundcloud", id: "x/y", url: "https://soundcloud.com/x/y" });
    expect(r?.title).toBe("Lofi Beat");
  });
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement**

```ts
// src/lib/oembed.ts
import type { Parsed } from "./url-parser";

export type Preview = { title: string; artist: string | null; thumbnail: string | null };

export async function fetchPreview(p: Parsed): Promise<Preview | null> {
  const endpoint = p.source === "youtube"
    ? `https://www.youtube.com/oembed?url=${encodeURIComponent(p.url)}&format=json`
    : `https://soundcloud.com/oembed?url=${encodeURIComponent(p.url)}&format=json`;
  const r = await fetch(endpoint);
  if (!r.ok) return null;
  const data = await r.json() as { title?: string; author_name?: string; thumbnail_url?: string };
  if (!data.title) return null;
  return {
    title: data.title,
    artist: data.author_name ?? null,
    thumbnail: data.thumbnail_url ?? null,
  };
}
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add src/lib/oembed.ts tests/oembed.test.ts
git commit -m "feat(lib): oEmbed metadata preview"
```

### Task 3.4: Worker client

**Files:** Create: `src/lib/worker-client.ts`

- [ ] **Step 1: Implement**

```ts
// src/lib/worker-client.ts
export async function dispatchJob(payload: { job_id: string; track_id: string; source_url: string }) {
  const url = process.env.WORKER_URL!;
  const res = await fetch(`${url.replace(/\/$/, "")}/extract`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-worker-secret": process.env.WORKER_SECRET!,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok && res.status !== 202) {
    throw new Error(`worker ${res.status}`);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/worker-client.ts
git commit -m "feat(lib): worker dispatch client"
```

### Task 3.5: Auth helper for API routes

**Files:** Create: `src/lib/require-auth.ts`

- [ ] **Step 1: Implement**

```ts
// src/lib/require-auth.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/require-auth.ts
git commit -m "feat(auth): requireAuth helper for API routes"
```

---

## Milestone 4 — Tracks API

### Task 4.1: `POST /api/tracks/preview`

**Files:** Create: `src/app/api/tracks/preview/route.ts`

- [ ] **Step 1: Implement**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/tracks/preview
git commit -m "feat(api): POST /api/tracks/preview"
```

### Task 4.2: `POST /api/tracks` (create + enqueue)

**Files:** Create: `src/app/api/tracks/route.ts`

- [ ] **Step 1: Implement**

```ts
// src/app/api/tracks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { getServiceClient } from "@/lib/db";
import { parseSourceUrl } from "@/lib/url-parser";
import { dispatchJob } from "@/lib/worker-client";

const Body = z.object({
  url: z.string().url(),
  title: z.string().min(1),
  artist: z.string().nullable().optional(),
  thumbnail_url: z.string().url().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const denied = await requireAuth(req); if (denied) return denied;
  const sp = req.nextUrl.searchParams;
  const limit = Math.min(parseInt(sp.get("limit") || "100", 10), 500);
  const order = sp.get("order") || "added_at.desc";
  const [col, dir] = order.split(".");
  const db = getServiceClient();
  const { data, error } = await db.from("tracks").select("*")
    .eq("status", "ready").order(col, { ascending: dir === "asc" }).limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tracks: data });
}

export async function POST(req: NextRequest) {
  const denied = await requireAuth(req); if (denied) return denied;
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad body" }, { status: 400 });

  const src = parseSourceUrl(parsed.data.url);
  if (!src) return NextResponse.json({ error: "unsupported url" }, { status: 400 });

  const db = getServiceClient();

  const { data: existing } = await db.from("tracks").select("*")
    .eq("source", src.source).eq("source_id", src.id).maybeSingle();
  if (existing) return NextResponse.json({ track: existing, alreadyExists: true });

  const { data: track, error } = await db.from("tracks").insert({
    source: src.source, source_url: src.url, source_id: src.id,
    title: parsed.data.title, artist: parsed.data.artist ?? null,
    thumbnail_url: parsed.data.thumbnail_url ?? null, status: "pending",
  }).select().single();
  if (error || !track) return NextResponse.json({ error: error?.message }, { status: 500 });

  const { data: job } = await db.from("import_jobs").insert({
    track_id: track.id, source_url: src.url, status: "queued",
  }).select().single();

  try {
    await dispatchJob({ job_id: job!.id, track_id: track.id, source_url: src.url });
  } catch {
    // leave queued; cron will retry
  }
  return NextResponse.json({ track });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/tracks/route.ts
git commit -m "feat(api): GET and POST /api/tracks"
```

### Task 4.3: `PATCH` and `DELETE /api/tracks/[id]`

**Files:** Create: `src/app/api/tracks/[id]/route.ts`

- [ ] **Step 1: Implement**

```ts
// src/app/api/tracks/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { getServiceClient } from "@/lib/db";
import { buildR2Key, deleteObject } from "@/lib/r2";

const Patch = z.object({
  title: z.string().min(1).optional(),
  artist: z.string().nullable().optional(),
  thumbnail_url: z.string().url().nullable().optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAuth(req); if (denied) return denied;
  const { id } = await ctx.params;
  const body = Patch.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const db = getServiceClient();
  const { data, error } = await db.from("tracks").update(body.data).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ track: data });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAuth(req); if (denied) return denied;
  const { id } = await ctx.params;
  const db = getServiceClient();
  const { data: track } = await db.from("tracks").select("r2_key").eq("id", id).maybeSingle();
  if (track?.r2_key) {
    try { await deleteObject(track.r2_key); } catch {}
    try { await deleteObject(buildR2Key("thumbnail", id)); } catch {}
  }
  await db.from("tracks").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/tracks/\[id\]/route.ts
git commit -m "feat(api): PATCH + DELETE /api/tracks/[id]"
```

### Task 4.4: `GET /api/tracks/[id]/stream`

**Files:** Create: `src/app/api/tracks/[id]/stream/route.ts`

- [ ] **Step 1: Implement**

```ts
// src/app/api/tracks/[id]/stream/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getServiceClient } from "@/lib/db";
import { presignUrl } from "@/lib/r2";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAuth(req); if (denied) return denied;
  const { id } = await ctx.params;
  const db = getServiceClient();
  const { data } = await db.from("tracks").select("r2_key, status").eq("id", id).maybeSingle();
  if (!data || data.status !== "ready" || !data.r2_key) {
    return NextResponse.json({ error: "not ready" }, { status: 404 });
  }
  const url = await presignUrl(data.r2_key, 3600);
  return NextResponse.redirect(url, { status: 302 });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/tracks/\[id\]/stream/route.ts
git commit -m "feat(api): GET /api/tracks/[id]/stream → presigned R2 redirect"
```

### Task 4.5: `POST /api/tracks/[id]/play`

**Files:** Create: `src/app/api/tracks/[id]/play/route.ts`

- [ ] **Step 1: Implement**

```ts
// src/app/api/tracks/[id]/play/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getServiceClient } from "@/lib/db";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAuth(req); if (denied) return denied;
  const { id } = await ctx.params;
  const db = getServiceClient();
  await db.rpc("increment_play", { p_track_id: id });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Create RPC migration**

```sql
-- supabase/migrations/20260417000002_increment_play.sql
create or replace function increment_play(p_track_id uuid)
returns void language sql as $$
  update tracks
  set played_count = played_count + 1, last_played_at = now()
  where id = p_track_id;
$$;
```

Apply: `pnpm supabase db reset`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tracks/\[id\]/play/route.ts supabase/migrations/20260417000002_increment_play.sql
git commit -m "feat(api): POST /api/tracks/[id]/play"
```

---

## Milestone 5 — Playlists API

### Task 5.1: `GET` / `POST /api/playlists`

**Files:** Create: `src/app/api/playlists/route.ts`

- [ ] **Step 1: Implement**

```ts
// src/app/api/playlists/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { getServiceClient } from "@/lib/db";

const Body = z.object({ name: z.string().min(1), description: z.string().nullable().optional() });

export async function GET(req: NextRequest) {
  const denied = await requireAuth(req); if (denied) return denied;
  const db = getServiceClient();
  const { data } = await db.from("playlists").select("*").order("created_at", { ascending: false });
  const { count: trackCount } = await db.from("tracks").select("id", { count: "exact", head: true }).eq("status", "ready");
  const smart = [
    { id: "smart:all", name: "All songs", smart: true, count: trackCount ?? 0 },
    { id: "smart:recent", name: "Recently added", smart: true },
    { id: "smart:most-played", name: "Most played", smart: true },
  ];
  return NextResponse.json({ playlists: data ?? [], smart });
}

export async function POST(req: NextRequest) {
  const denied = await requireAuth(req); if (denied) return denied;
  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const db = getServiceClient();
  const { data, error } = await db.from("playlists").insert({
    name: body.data.name, description: body.data.description ?? null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ playlist: data });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/playlists/route.ts
git commit -m "feat(api): GET + POST /api/playlists"
```

### Task 5.2: `GET` / `PATCH` / `DELETE /api/playlists/[id]`

**Files:** Create: `src/app/api/playlists/[id]/route.ts`

- [ ] **Step 1: Implement**

```ts
// src/app/api/playlists/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { getServiceClient } from "@/lib/db";

const Patch = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  thumbnail_url: z.string().url().nullable().optional(),
});

async function resolveSmart(id: string) {
  const db = getServiceClient();
  const q = db.from("tracks").select("*").eq("status", "ready");
  if (id === "smart:all") return (await q.order("title")).data ?? [];
  if (id === "smart:recent") return (await q.order("added_at", { ascending: false }).limit(50)).data ?? [];
  if (id === "smart:most-played") return (await q.gt("played_count", 0).order("played_count", { ascending: false }).limit(50)).data ?? [];
  return null;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAuth(req); if (denied) return denied;
  const { id } = await ctx.params;
  if (id.startsWith("smart:")) {
    const tracks = await resolveSmart(id);
    if (tracks === null) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ playlist: { id, name: id.replace("smart:", ""), smart: true }, tracks });
  }
  const db = getServiceClient();
  const { data: pl } = await db.from("playlists").select("*").eq("id", id).maybeSingle();
  if (!pl) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { data: rows } = await db.from("playlist_tracks")
    .select("position, track:tracks(*)").eq("playlist_id", id).order("position");
  return NextResponse.json({ playlist: pl, tracks: (rows ?? []).map(r => r.track) });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAuth(req); if (denied) return denied;
  const { id } = await ctx.params;
  if (id.startsWith("smart:")) return NextResponse.json({ error: "read only" }, { status: 400 });
  const body = Patch.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const db = getServiceClient();
  const { data, error } = await db.from("playlists").update(body.data).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ playlist: data });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAuth(req); if (denied) return denied;
  const { id } = await ctx.params;
  if (id.startsWith("smart:")) return NextResponse.json({ error: "read only" }, { status: 400 });
  const db = getServiceClient();
  await db.from("playlists").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/playlists/\[id\]/route.ts
git commit -m "feat(api): playlist detail routes incl. smart playlists"
```

### Task 5.3: Playlist track membership + reorder

**Files:** Create: `src/app/api/playlists/[id]/tracks/route.ts`, `src/app/api/playlists/[id]/tracks/[tid]/route.ts`, `src/app/api/playlists/[id]/reorder/route.ts`

- [ ] **Step 1: Implement add**

```ts
// src/app/api/playlists/[id]/tracks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { getServiceClient } from "@/lib/db";

const Body = z.object({ track_id: z.string().uuid() });

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAuth(req); if (denied) return denied;
  const { id } = await ctx.params;
  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const db = getServiceClient();
  const { data: last } = await db.from("playlist_tracks").select("position")
    .eq("playlist_id", id).order("position", { ascending: false }).limit(1).maybeSingle();
  const pos = (last?.position ?? -1) + 1;
  const { error } = await db.from("playlist_tracks").insert({
    playlist_id: id, track_id: body.data.track_id, position: pos,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Implement remove**

```ts
// src/app/api/playlists/[id]/tracks/[tid]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getServiceClient } from "@/lib/db";

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string; tid: string }> }) {
  const denied = await requireAuth(req); if (denied) return denied;
  const { id, tid } = await ctx.params;
  const db = getServiceClient();
  await db.from("playlist_tracks").delete().eq("playlist_id", id).eq("track_id", tid);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Implement reorder**

```ts
// src/app/api/playlists/[id]/reorder/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { getServiceClient } from "@/lib/db";

const Body = z.object({ order: z.array(z.string().uuid()) });

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAuth(req); if (denied) return denied;
  const { id } = await ctx.params;
  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const db = getServiceClient();
  // Temporary offset to avoid unique conflicts if we had one; we don't, but good practice
  for (let i = 0; i < body.data.order.length; i++) {
    await db.from("playlist_tracks").update({ position: i })
      .eq("playlist_id", id).eq("track_id", body.data.order[i]);
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/playlists/\[id\]/
git commit -m "feat(api): playlist track add/remove/reorder"
```

---

## Milestone 6 — Import jobs API + cron

### Task 6.1: Import job list + retry

**Files:** Create: `src/app/api/import-jobs/route.ts`, `src/app/api/import-jobs/[id]/retry/route.ts`

- [ ] **Step 1: Implement list**

```ts
// src/app/api/import-jobs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getServiceClient } from "@/lib/db";

export async function GET(req: NextRequest) {
  const denied = await requireAuth(req); if (denied) return denied;
  const db = getServiceClient();
  const { data } = await db.from("import_jobs")
    .select("*, track:tracks(id, title, artist, thumbnail_url, status)")
    .order("created_at", { ascending: false }).limit(50);
  return NextResponse.json({ jobs: data ?? [] });
}
```

- [ ] **Step 2: Implement retry**

```ts
// src/app/api/import-jobs/[id]/retry/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getServiceClient } from "@/lib/db";
import { dispatchJob } from "@/lib/worker-client";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAuth(req); if (denied) return denied;
  const { id } = await ctx.params;
  const db = getServiceClient();
  const { data: job } = await db.from("import_jobs").select("*").eq("id", id).maybeSingle();
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });
  await db.from("import_jobs").update({ status: "queued", error_message: null, finished_at: null }).eq("id", id);
  await db.from("tracks").update({ status: "pending", error_message: null }).eq("id", job.track_id);
  try { await dispatchJob({ job_id: id, track_id: job.track_id, source_url: job.source_url }); } catch {}
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/import-jobs/
git commit -m "feat(api): import jobs list + retry"
```

### Task 6.2: Cron route

**Files:** Create: `src/app/api/cron/retry-queued/route.ts`, `vercel.json`

- [ ] **Step 1: Implement cron**

```ts
// src/app/api/cron/retry-queued/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db";
import { dispatchJob } from "@/lib/worker-client";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = getServiceClient();
  const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data: jobs } = await db.from("import_jobs")
    .select("*").eq("status", "queued").lt("created_at", cutoff).limit(20);
  for (const j of jobs ?? []) {
    try { await dispatchJob({ job_id: j.id, track_id: j.track_id, source_url: j.source_url }); } catch {}
  }
  return NextResponse.json({ retried: jobs?.length ?? 0 });
}
```

- [ ] **Step 2: Register cron**

```json
// vercel.json
{
  "crons": [
    { "path": "/api/cron/retry-queued", "schedule": "*/10 * * * *" }
  ]
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron vercel.json
git commit -m "feat(cron): retry queued jobs every 10min"
```

---

## Milestone 7 — Python worker (Cloud Run)

### Task 7.1: Worker skeleton

**Files:** Create: `worker/pyproject.toml`, `worker/Dockerfile`, `worker/app/main.py`

- [ ] **Step 1: Write pyproject**

```toml
# worker/pyproject.toml
[project]
name = "tokioto-worker"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
  "fastapi>=0.115",
  "uvicorn[standard]>=0.32",
  "yt-dlp>=2024.12.13",
  "supabase>=2.9",
  "boto3>=1.35",
  "colorthief>=0.2.1",
  "pydantic>=2.9",
  "httpx>=0.27",
]

[project.optional-dependencies]
dev = ["pytest>=8", "pytest-asyncio>=0.24"]
```

- [ ] **Step 2: Write Dockerfile**

```dockerfile
# worker/Dockerfile
FROM python:3.12-slim
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY pyproject.toml ./
RUN pip install --no-cache-dir .
COPY app ./app
ENV PORT=8080
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
```

- [ ] **Step 3: Write main.py**

```python
# worker/app/main.py
import asyncio
import os
from fastapi import FastAPI, Header, HTTPException, BackgroundTasks
from pydantic import BaseModel
from .extractor import extract_and_upload

app = FastAPI()

class ExtractReq(BaseModel):
    job_id: str
    track_id: str
    source_url: str

@app.get("/health")
async def health():
    return {"ok": True}

@app.post("/extract", status_code=202)
async def extract(req: ExtractReq, tasks: BackgroundTasks, x_worker_secret: str | None = Header(default=None)):
    if x_worker_secret != os.environ["WORKER_SECRET"]:
        raise HTTPException(401, "bad secret")
    tasks.add_task(_run, req)
    return {"accepted": True}

def _run(req: ExtractReq):
    try:
        asyncio.run(extract_and_upload(req.job_id, req.track_id, req.source_url))
    except Exception as e:
        # extractor writes failure to DB itself; log here
        print(f"[worker] unhandled: {e}", flush=True)
```

- [ ] **Step 4: Commit**

```bash
git add worker/pyproject.toml worker/Dockerfile worker/app/main.py
git commit -m "feat(worker): FastAPI skeleton + Dockerfile"
```

### Task 7.2: Extractor module (TDD with mocked yt-dlp)

**Files:** Create: `worker/app/extractor.py`, `worker/tests/test_extractor.py`, `worker/app/__init__.py`, `worker/tests/__init__.py`

- [ ] **Step 1: Write failing test**

```python
# worker/tests/test_extractor.py
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from pathlib import Path
from app.extractor import _build_ydl_opts, _download_audio

def test_build_opts_writes_mp3_to_output():
    opts = _build_ydl_opts("/tmp/x.mp3")
    assert opts["format"] == "bestaudio/best"
    assert opts["outtmpl"] == "/tmp/x.%(ext)s"
    pp = opts["postprocessors"]
    assert any(p["preferredcodec"] == "mp3" for p in pp)

def test_download_invokes_ytdl(tmp_path):
    mock_ydl = MagicMock()
    mock_ydl.__enter__.return_value = mock_ydl
    mock_ydl.extract_info.return_value = {"title": "T", "uploader": "U", "duration": 120, "thumbnail": "http://x/y.jpg"}
    with patch("app.extractor.YoutubeDL", return_value=mock_ydl):
        info = _download_audio("https://youtu.be/abc", str(tmp_path / "out.mp3"))
    assert info["title"] == "T"
    assert info["duration"] == 120
```

- [ ] **Step 2: Run — expect fail**

```bash
cd worker && pip install -e .[dev]
pytest
```

- [ ] **Step 3: Implement**

```python
# worker/app/extractor.py
import os
import tempfile
import io
import httpx
from pathlib import Path
from typing import Any
from yt_dlp import YoutubeDL
from colorthief import ColorThief
from .storage import upload_audio, upload_thumbnail
from .db import set_track_ready, set_track_failed, set_job_running, set_job_done, set_job_failed

def _build_ydl_opts(out_path: str) -> dict[str, Any]:
    base = out_path.rsplit(".", 1)[0]
    return {
        "format": "bestaudio/best",
        "outtmpl": f"{base}.%(ext)s",
        "noplaylist": True,
        "quiet": True,
        "postprocessors": [
            {"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "192"},
        ],
    }

def _download_audio(source_url: str, out_path: str) -> dict[str, Any]:
    opts = _build_ydl_opts(out_path)
    with YoutubeDL(opts) as ydl:
        info = ydl.extract_info(source_url, download=True)
    return info

def _extract_color(data: bytes) -> str | None:
    try:
        ct = ColorThief(io.BytesIO(data))
        r, g, b = ct.get_color(quality=5)
        return f"#{r:02x}{g:02x}{b:02x}"
    except Exception:
        return None

async def extract_and_upload(job_id: str, track_id: str, source_url: str):
    await set_job_running(job_id)
    try:
        with tempfile.TemporaryDirectory() as tmp:
            out_path = str(Path(tmp) / f"{track_id}.mp3")
            info = _download_audio(source_url, out_path)
            actual = next((p for p in Path(tmp).iterdir() if p.suffix == ".mp3"), None)
            if not actual: raise RuntimeError("no mp3 produced")
            await upload_audio(track_id, actual.read_bytes())

            thumb_url = info.get("thumbnail")
            accent = None
            if thumb_url:
                async with httpx.AsyncClient(timeout=30) as http:
                    r = await http.get(thumb_url)
                    if r.status_code == 200:
                        await upload_thumbnail(track_id, r.content)
                        accent = _extract_color(r.content)

        await set_track_ready(track_id, {
            "duration_sec": int(info.get("duration") or 0),
            "title_fallback": info.get("title"),
            "artist_fallback": info.get("uploader"),
            "accent_color": accent,
        })
        await set_job_done(job_id)
    except Exception as e:
        await set_track_failed(track_id, str(e))
        await set_job_failed(job_id, str(e))
```

- [ ] **Step 4: Run — expect pass (unit tests only; storage/db stubs yet to be built)**

- [ ] **Step 5: Commit**

```bash
git add worker/app/extractor.py worker/tests
git commit -m "feat(worker): extractor with yt-dlp + colorthief"
```

### Task 7.3: Storage and DB modules

**Files:** Create: `worker/app/storage.py`, `worker/app/db.py`

- [ ] **Step 1: Storage**

```python
# worker/app/storage.py
import os
import boto3

def _client():
    return boto3.client(
        "s3",
        endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name="auto",
    )

async def upload_audio(track_id: str, data: bytes):
    _client().put_object(Bucket=os.environ["R2_BUCKET"], Key=f"audio/{track_id}.mp3", Body=data, ContentType="audio/mpeg")

async def upload_thumbnail(track_id: str, data: bytes):
    _client().put_object(Bucket=os.environ["R2_BUCKET"], Key=f"thumbnails/{track_id}.jpg", Body=data, ContentType="image/jpeg")
```

- [ ] **Step 2: DB**

```python
# worker/app/db.py
import os
from supabase import create_client
from datetime import datetime, timezone

def _db():
    return create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

async def set_job_running(job_id: str):
    _db().table("import_jobs").update({"status": "running"}).eq("id", job_id).execute()

async def set_job_done(job_id: str):
    _db().table("import_jobs").update({"status": "done", "finished_at": datetime.now(timezone.utc).isoformat()}).eq("id", job_id).execute()

async def set_job_failed(job_id: str, msg: str):
    _db().table("import_jobs").update({"status": "failed", "error_message": msg, "finished_at": datetime.now(timezone.utc).isoformat()}).eq("id", job_id).execute()

async def set_track_ready(track_id: str, fields: dict):
    patch = {
        "status": "ready",
        "r2_key": f"audio/{track_id}.mp3",
        "duration_sec": fields.get("duration_sec"),
        "accent_color": fields.get("accent_color"),
    }
    # fill title/artist only if user didn't provide
    db = _db()
    row = db.table("tracks").select("title, artist, thumbnail_url").eq("id", track_id).single().execute().data
    if row and (not row.get("artist")) and fields.get("artist_fallback"):
        patch["artist"] = fields["artist_fallback"]
    if not row.get("thumbnail_url"):
        patch["thumbnail_url"] = f"thumbnails/{track_id}.jpg"
    db.table("tracks").update(patch).eq("id", track_id).execute()

async def set_track_failed(track_id: str, msg: str):
    _db().table("tracks").update({"status": "failed", "error_message": msg}).eq("id", track_id).execute()
```

- [ ] **Step 3: Commit**

```bash
git add worker/app/storage.py worker/app/db.py
git commit -m "feat(worker): R2 storage + Supabase DB modules"
```

### Task 7.4: Run worker locally

- [ ] **Step 1: Local smoke test**

```bash
cd worker
export WORKER_SECRET=localsecret
export NEXT_PUBLIC_SUPABASE_URL=<from pnpm supabase status>
export SUPABASE_SERVICE_ROLE_KEY=<from pnpm supabase status>
export R2_ACCOUNT_ID=<your>
export R2_ACCESS_KEY_ID=<your>
export R2_SECRET_ACCESS_KEY=<your>
export R2_BUCKET=tokioto
uvicorn app.main:app --reload --port 8080
```

- [ ] **Step 2: Hit health**

```bash
curl http://localhost:8080/health
```

Expected: `{"ok":true}`.

- [ ] **Step 3: Update `.env.local` of Next.js**

Set `WORKER_URL=http://localhost:8080`, `WORKER_SECRET=localsecret`.

- [ ] **Step 4: End-to-end: paste URL**

Use a REST client to hit the Next.js API:
```bash
# login first (draw pattern in browser), grab cookie, then:
curl -X POST http://localhost:3000/api/tracks \
  -H 'content-type: application/json' \
  -H 'cookie: session=<token>' \
  -d '{"url":"https://youtu.be/dQw4w9WgXcQ","title":"Never Gonna Give You Up"}'
```

Expected: response with `track` object, worker logs show download, Supabase `tracks.status` flips to `ready`.

- [ ] **Step 5: Commit docs**

Create `worker/README.md` with the local run steps above; commit.

```bash
git add worker/README.md
git commit -m "docs(worker): local run instructions"
```

---

## Milestone 8 — UI shell & navigation

### Task 8.1: Root layout with auth-aware shell

**Files:** Modify: `src/app/layout.tsx`, `src/app/globals.css`; Create: `src/components/Layout/TabBar.tsx`

- [ ] **Step 1: Replace default layout**

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import TabBar from "@/components/Layout/TabBar";

export const metadata: Metadata = {
  title: "Tokioto",
  description: "Personal music",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="bg-black text-white min-h-screen">
        <div className="pb-20">{children}</div>
        <TabBar />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Implement TabBar**

```tsx
// src/components/Layout/TabBar.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Library", icon: "♪" },
  { href: "/playlists", label: "Playlists", icon: "☰" },
  { href: "/import", label: "Import", icon: "+" },
];

export default function TabBar() {
  const path = usePathname();
  if (path === "/login" || path === "/setup") return null;
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur border-t border-white/10 flex justify-around py-2 z-20">
      {TABS.map((t) => {
        const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={`flex flex-col items-center gap-1 px-4 py-1 ${active ? "text-white" : "text-white/50"}`}>
            <span className="text-lg">{t.icon}</span>
            <span className="text-xs">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx src/components/Layout
git commit -m "feat(ui): root layout + bottom TabBar"
```

---

## Milestone 9 — Library & Import pages

### Task 9.1: TrackCard component

**Files:** Create: `src/components/Library/TrackCard.tsx`, `src/types/index.ts`

- [ ] **Step 1: Types**

```ts
// src/types/index.ts
export type Track = {
  id: string; source: "youtube" | "soundcloud"; title: string; artist: string | null;
  duration_sec: number | null; thumbnail_url: string | null; r2_key: string | null;
  accent_color: string | null; status: "pending" | "processing" | "ready" | "failed";
  added_at: string; played_count: number;
};
export type Playlist = { id: string; name: string; description: string | null; thumbnail_url: string | null; created_at: string; smart?: boolean };
```

- [ ] **Step 2: TrackCard**

```tsx
// src/components/Library/TrackCard.tsx
"use client";
import type { Track } from "@/types";

export default function TrackCard({ track, onPlay }: { track: Track; onPlay: () => void }) {
  const src = track.thumbnail_url?.startsWith("http")
    ? track.thumbnail_url
    : track.thumbnail_url ? `/api/r2/${track.thumbnail_url}` : null;
  return (
    <button onClick={onPlay} className="flex items-center gap-3 w-full p-2 rounded hover:bg-white/5 text-left">
      <div className="w-12 h-12 rounded bg-white/10 overflow-hidden flex-shrink-0">
        {src && <img src={src} alt="" className="w-full h-full object-cover" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{track.title}</div>
        <div className="text-xs text-white/60 truncate">{track.artist ?? "—"}</div>
      </div>
      {track.status !== "ready" && (
        <span className="text-xs px-2 py-0.5 rounded bg-white/10">{track.status}</span>
      )}
    </button>
  );
}
```

- [ ] **Step 3: R2 proxy route for thumbnails**

```ts
// src/app/api/r2/[...path]/route.ts
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
```

- [ ] **Step 4: Commit**

```bash
git add src/types src/components/Library src/app/api/r2
git commit -m "feat(ui): TrackCard + R2 thumbnail proxy"
```

### Task 9.2: Library page

**Files:** Modify: `src/app/page.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/app/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Track } from "@/types";
import TrackCard from "@/components/Library/TrackCard";

export default function Library() {
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const router = useRouter();
  useEffect(() => {
    fetch("/api/tracks").then(r => r.json()).then(d => setTracks(d.tracks));
  }, []);
  return (
    <main className="p-4 pt-8">
      <h1 className="text-2xl font-semibold mb-4">Library</h1>
      {tracks === null && <p className="opacity-60">Loading…</p>}
      {tracks && tracks.length === 0 && <p className="opacity-60">Chưa có bài nào. Vào tab Import để thêm.</p>}
      <div className="flex flex-col">
        {tracks?.map(t => (
          <TrackCard key={t.id} track={t} onPlay={() => router.push(`/player?track=${t.id}`)} />
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(ui): Library page"
```

### Task 9.3: Import page

**Files:** Create: `src/app/import/page.tsx`, `src/components/Import/ImportForm.tsx`, `src/components/Import/JobHistory.tsx`

- [ ] **Step 1: ImportForm**

```tsx
// src/components/Import/ImportForm.tsx
"use client";
import { useState } from "react";

type Preview = { title: string; artist: string | null; thumbnail: string | null; source: string; source_id: string; source_url: string };

export default function ImportForm({ onImported }: { onImported: () => void }) {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [form, setForm] = useState<{ title: string; artist: string; thumbnail_url: string }>({ title: "", artist: "", thumbnail_url: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function getPreview() {
    setErr(null); setBusy(true);
    const r = await fetch("/api/tracks/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
    setBusy(false);
    if (!r.ok) { setErr("Không lấy được preview"); return; }
    const p = await r.json() as Preview;
    setPreview(p);
    setForm({ title: p.title, artist: p.artist ?? "", thumbnail_url: p.thumbnail ?? "" });
  }

  async function submit() {
    if (!preview) return;
    setErr(null); setBusy(true);
    const r = await fetch("/api/tracks", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: preview.source_url,
        title: form.title,
        artist: form.artist || null,
        thumbnail_url: form.thumbnail_url || null,
      }),
    });
    setBusy(false);
    if (!r.ok) { setErr("Lỗi"); return; }
    setUrl(""); setPreview(null); setForm({ title: "", artist: "", thumbnail_url: "" });
    onImported();
  }

  if (!preview) {
    return (
      <div className="flex flex-col gap-2">
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Dán link YouTube/SoundCloud" className="p-3 rounded bg-white/10 outline-none" />
        <button onClick={getPreview} disabled={!url || busy} className="p-3 rounded bg-white text-black disabled:opacity-40">Xem trước</button>
        {err && <p className="text-red-400 text-sm">{err}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {form.thumbnail_url && <img src={form.thumbnail_url} className="w-40 h-40 object-cover rounded mx-auto" />}
      <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Tên bài" className="p-3 rounded bg-white/10" />
      <input value={form.artist} onChange={e => setForm({ ...form, artist: e.target.value })} placeholder="Nghệ sĩ" className="p-3 rounded bg-white/10" />
      <input value={form.thumbnail_url} onChange={e => setForm({ ...form, thumbnail_url: e.target.value })} placeholder="Thumbnail URL" className="p-3 rounded bg-white/10" />
      <div className="flex gap-2">
        <button onClick={() => setPreview(null)} className="flex-1 p-3 rounded bg-white/10">Huỷ</button>
        <button onClick={submit} disabled={busy} className="flex-1 p-3 rounded bg-white text-black disabled:opacity-40">Thêm</button>
      </div>
      {err && <p className="text-red-400 text-sm">{err}</p>}
    </div>
  );
}
```

- [ ] **Step 2: JobHistory**

```tsx
// src/components/Import/JobHistory.tsx
"use client";
import { useEffect, useState } from "react";

type Job = { id: string; status: string; error_message: string | null; created_at: string; track: { title: string; thumbnail_url: string | null } | null };

export default function JobHistory({ reloadFlag }: { reloadFlag: number }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  useEffect(() => {
    const load = () => fetch("/api/import-jobs").then(r => r.json()).then(d => setJobs(d.jobs));
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [reloadFlag]);
  const retry = async (id: string) => { await fetch(`/api/import-jobs/${id}/retry`, { method: "POST" }); };
  return (
    <ul className="flex flex-col gap-2">
      {jobs.map(j => (
        <li key={j.id} className="flex items-center gap-3 p-2 rounded bg-white/5">
          <div className="flex-1 min-w-0">
            <div className="truncate">{j.track?.title ?? j.id}</div>
            <div className={`text-xs ${j.status === "failed" ? "text-red-400" : "text-white/60"}`}>{j.status}{j.error_message ? ` — ${j.error_message}` : ""}</div>
          </div>
          {j.status === "failed" && <button onClick={() => retry(j.id)} className="text-xs px-3 py-1 rounded bg-white text-black">Retry</button>}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Page**

```tsx
// src/app/import/page.tsx
"use client";
import { useState } from "react";
import ImportForm from "@/components/Import/ImportForm";
import JobHistory from "@/components/Import/JobHistory";

export default function Import() {
  const [flag, setFlag] = useState(0);
  return (
    <main className="p-4 pt-8 flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Import</h1>
      <ImportForm onImported={() => setFlag(f => f + 1)} />
      <section>
        <h2 className="text-sm uppercase tracking-wider opacity-60 mb-2">Lịch sử</h2>
        <JobHistory reloadFlag={flag} />
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/import src/components/Import
git commit -m "feat(ui): Import tab with preview + job history"
```

---

## Milestone 10 — Playlists pages

### Task 10.1: Playlist collage + card

**Files:** Create: `src/components/Playlist/PlaylistCollage.tsx`, `src/components/Playlist/PlaylistCard.tsx`

- [ ] **Step 1: Collage**

```tsx
// src/components/Playlist/PlaylistCollage.tsx
export default function PlaylistCollage({ thumbs }: { thumbs: (string | null)[] }) {
  const cells = Array.from({ length: 4 }).map((_, i) => thumbs[i] ?? null);
  return (
    <div className="grid grid-cols-2 w-full aspect-square overflow-hidden rounded-md bg-white/10">
      {cells.map((t, i) => (
        <div key={i} className="bg-white/5">
          {t && <img src={t.startsWith("http") ? t : `/api/r2/${t}`} className="w-full h-full object-cover" alt="" />}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Card**

```tsx
// src/components/Playlist/PlaylistCard.tsx
import Link from "next/link";
import PlaylistCollage from "./PlaylistCollage";

export default function PlaylistCard({ id, name, thumbs, smart }: { id: string; name: string; thumbs: (string | null)[]; smart?: boolean }) {
  return (
    <Link href={`/playlists/${encodeURIComponent(id)}`} className="flex flex-col gap-2">
      <PlaylistCollage thumbs={thumbs} />
      <div className="text-sm">{name}{smart && <span className="ml-1 text-white/40 text-xs">smart</span>}</div>
    </Link>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Playlist
git commit -m "feat(ui): playlist collage + card"
```

### Task 10.2: Playlists page

**Files:** Create: `src/app/playlists/page.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/app/playlists/page.tsx
"use client";
import { useEffect, useState } from "react";
import PlaylistCard from "@/components/Playlist/PlaylistCard";
import type { Playlist } from "@/types";

type WithThumbs = Playlist & { thumbs: (string | null)[] };

export default function Playlists() {
  const [user, setUser] = useState<WithThumbs[]>([]);
  const [smart, setSmart] = useState<WithThumbs[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  async function load() {
    const d = await fetch("/api/playlists").then(r => r.json());
    // for each, fetch first 4 tracks to build collage thumbs
    const hydrate = async (pl: Playlist) => {
      const detail = await fetch(`/api/playlists/${encodeURIComponent(pl.id)}`).then(r => r.json());
      const thumbs = (detail.tracks ?? []).slice(0, 4).map((t: any) => t.thumbnail_url ?? null);
      return { ...pl, thumbs };
    };
    setUser(await Promise.all((d.playlists as Playlist[]).map(hydrate)));
    setSmart(await Promise.all((d.smart as Playlist[]).map(hydrate)));
  }

  useEffect(() => { load(); }, []);

  async function create() {
    if (!name) return;
    await fetch("/api/playlists", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
    setName(""); setCreating(false); load();
  }

  return (
    <main className="p-4 pt-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Playlists</h1>
        <button onClick={() => setCreating(v => !v)} className="px-3 py-1 rounded bg-white/10 text-sm">+ New</button>
      </div>
      {creating && (
        <div className="flex gap-2">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Tên playlist" className="flex-1 p-2 rounded bg-white/10" />
          <button onClick={create} className="px-3 rounded bg-white text-black">Tạo</button>
        </div>
      )}
      <section>
        <h2 className="text-sm uppercase tracking-wider opacity-60 mb-2">Smart</h2>
        <div className="grid grid-cols-2 gap-3">
          {smart.map(p => <PlaylistCard key={p.id} id={p.id} name={p.name} thumbs={p.thumbs} smart />)}
        </div>
      </section>
      <section>
        <h2 className="text-sm uppercase tracking-wider opacity-60 mb-2">Của tôi</h2>
        <div className="grid grid-cols-2 gap-3">
          {user.map(p => <PlaylistCard key={p.id} id={p.id} name={p.name} thumbs={p.thumbs} />)}
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/playlists/page.tsx
git commit -m "feat(ui): playlists list page"
```

### Task 10.3: Playlist detail page with reorder

**Files:** Create: `src/app/playlists/[id]/page.tsx`

- [ ] **Step 1: Install dnd lib**

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: Implement**

```tsx
// src/app/playlists/[id]/page.tsx
"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Track } from "@/types";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import TrackCard from "@/components/Library/TrackCard";

export default function PlaylistDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [name, setName] = useState("");
  const [smart, setSmart] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  async function load() {
    const d = await fetch(`/api/playlists/${encodeURIComponent(id)}`).then(r => r.json());
    setTracks(d.tracks); setName(d.playlist.name); setSmart(!!d.playlist.smart);
  }
  useEffect(() => { load(); }, [id]);

  async function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIdx = tracks.findIndex(t => t.id === e.active.id);
    const newIdx = tracks.findIndex(t => t.id === e.over!.id);
    const next = arrayMove(tracks, oldIdx, newIdx);
    setTracks(next);
    await fetch(`/api/playlists/${encodeURIComponent(id)}/reorder`, {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ order: next.map(t => t.id) }),
    });
  }

  return (
    <main className="p-4 pt-8 flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{name}</h1>
      {!smart ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={tracks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {tracks.map(t => <SortableRow key={t.id} track={t} onPlay={() => router.push(`/player?track=${t.id}&playlist=${encodeURIComponent(id)}`)} />)}
          </SortableContext>
        </DndContext>
      ) : (
        tracks.map(t => <TrackCard key={t.id} track={t} onPlay={() => router.push(`/player?track=${t.id}&playlist=${encodeURIComponent(id)}`)} />)
      )}
    </main>
  );
}

function SortableRow({ track, onPlay }: { track: Track; onPlay: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: track.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TrackCard track={track} onPlay={onPlay} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/playlists/\[id\] package.json pnpm-lock.yaml
git commit -m "feat(ui): playlist detail with drag-reorder"
```

---

## Milestone 11 — Player & Media Session

### Task 11.1: usePlayer hook

**Files:** Create: `src/hooks/usePlayer.ts`

- [ ] **Step 1: Implement**

```ts
// src/hooks/usePlayer.ts
"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Track } from "@/types";

type PlayerState = {
  queue: Track[];
  index: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
};

export function usePlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<PlayerState>({ queue: [], index: 0, isPlaying: false, currentTime: 0, duration: 0 });
  const current = state.queue[state.index];

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!audioRef.current) audioRef.current = new Audio();
    const a = audioRef.current;
    const ontime = () => setState(s => ({ ...s, currentTime: a.currentTime, duration: a.duration || 0 }));
    const onend = () => setState(s => ({ ...s, index: Math.min(s.index + 1, s.queue.length - 1), currentTime: 0 }));
    a.addEventListener("timeupdate", ontime);
    a.addEventListener("ended", onend);
    return () => { a.removeEventListener("timeupdate", ontime); a.removeEventListener("ended", onend); };
  }, []);

  useEffect(() => {
    const a = audioRef.current; if (!a || !current) return;
    a.src = `/api/tracks/${current.id}/stream`;
    if (state.isPlaying) a.play().catch(() => {});
  }, [current?.id]);

  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    if (state.isPlaying) a.play().catch(() => {}); else a.pause();
  }, [state.isPlaying]);

  const setQueue = useCallback((tracks: Track[], startIndex = 0) => {
    setState(s => ({ ...s, queue: tracks, index: startIndex, isPlaying: true, currentTime: 0 }));
  }, []);
  const play = useCallback(() => setState(s => ({ ...s, isPlaying: true })), []);
  const pause = useCallback(() => setState(s => ({ ...s, isPlaying: false })), []);
  const toggle = useCallback(() => setState(s => ({ ...s, isPlaying: !s.isPlaying })), []);
  const next = useCallback(() => setState(s => s.index < s.queue.length - 1 ? { ...s, index: s.index + 1 } : s), []);
  const prev = useCallback(() => setState(s => s.index > 0 ? { ...s, index: s.index - 1 } : s), []);
  const seek = useCallback((t: number) => { if (audioRef.current) audioRef.current.currentTime = t; }, []);
  const moveTo = useCallback((i: number) => setState(s => ({ ...s, index: i })), []);

  return useMemo(() => ({ ...state, current, setQueue, play, pause, toggle, next, prev, seek, moveTo }), [state, current, setQueue, play, pause, toggle, next, prev, seek, moveTo]);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/usePlayer.ts
git commit -m "feat(player): usePlayer hook with queue + audio element"
```

### Task 11.2: Media Session integration

**Files:** Create: `src/hooks/useMediaSession.ts`

- [ ] **Step 1: Implement**

```ts
// src/hooks/useMediaSession.ts
"use client";
import { useEffect } from "react";
import type { Track } from "@/types";

type Handlers = { play: () => void; pause: () => void; next: () => void; prev: () => void; seek: (t: number) => void };

export function useMediaSession(current: Track | null, h: Handlers) {
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator) || !current) return;
    const art = current.thumbnail_url?.startsWith("http") ? current.thumbnail_url : current.thumbnail_url ? `/api/r2/${current.thumbnail_url}` : "";
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: current.title, artist: current.artist ?? "",
      artwork: art ? [{ src: art, sizes: "512x512" }] : [],
    });
    navigator.mediaSession.setActionHandler("play", h.play);
    navigator.mediaSession.setActionHandler("pause", h.pause);
    navigator.mediaSession.setActionHandler("previoustrack", h.prev);
    navigator.mediaSession.setActionHandler("nexttrack", h.next);
    navigator.mediaSession.setActionHandler("seekto", (d) => { if (typeof d.seekTime === "number") h.seek(d.seekTime); });
  }, [current?.id]);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useMediaSession.ts
git commit -m "feat(player): Media Session API integration"
```

### Task 11.3: Vinyl component

**Files:** Create: `src/components/Player/Vinyl.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/Player/Vinyl.tsx
"use client";

export default function Vinyl({ src, playing }: { src: string | null; playing: boolean }) {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] aspect-square">
      <div
        className="w-full h-full rounded-full relative shadow-[0_30px_70px_rgba(0,0,0,0.7)] overflow-hidden"
        style={{
          backgroundImage: src ? `url(${src})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          animation: playing ? "spin 12s linear infinite" : "none",
        }}
      >
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `
              radial-gradient(circle, transparent 46%, rgba(0,0,0,0.22) 47%, rgba(0,0,0,0.22) 47.5%, transparent 48%),
              radial-gradient(circle, transparent 38%, rgba(0,0,0,0.22) 39%, rgba(0,0,0,0.22) 39.5%, transparent 40%),
              radial-gradient(circle, transparent 30%, rgba(0,0,0,0.3)  31%, rgba(0,0,0,0.3)  31.5%, transparent 32%)
            `,
          }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[8%] aspect-square rounded-full bg-black border-2 border-white/30" />
      </div>
      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Player/Vinyl.tsx
git commit -m "feat(player): Vinyl component with rotation"
```

### Task 11.4: Controls component

**Files:** Create: `src/components/Player/Controls.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/Player/Controls.tsx
"use client";

type Props = {
  isPlaying: boolean; currentTime: number; duration: number;
  onPlayPause: () => void; onNext: () => void; onPrev: () => void;
  onSeek: (t: number) => void; accent?: string | null;
  shuffle: boolean; onShuffle: () => void; loop: boolean; onLoop: () => void;
};

function fmt(t: number) { if (!isFinite(t)) return "0:00"; const m = Math.floor(t / 60); const s = Math.floor(t % 60); return `${m}:${s.toString().padStart(2,"0")}`; }

export default function Controls(p: Props) {
  const pct = p.duration > 0 ? (p.currentTime / p.duration) * 100 : 0;
  const fill = p.accent ?? "#ffffff";
  return (
    <div className="w-full">
      <div className="h-[3px] w-full bg-white/25 rounded overflow-hidden" onClick={(e) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        p.onSeek(((e.clientX - rect.left) / rect.width) * p.duration);
      }}>
        <div style={{ width: `${pct}%`, background: fill }} className="h-full" />
      </div>
      <div className="flex justify-between text-[10px] opacity-70 mt-1 mb-4"><span>{fmt(p.currentTime)}</span><span>-{fmt(Math.max(0, p.duration - p.currentTime))}</span></div>
      <div className="flex justify-around items-center">
        <button onClick={p.onShuffle} className={p.shuffle ? "opacity-100" : "opacity-60"}>🔀</button>
        <button onClick={p.onPrev}>⏮</button>
        <button onClick={p.onPlayPause} className="w-16 h-16 rounded-full text-black text-2xl" style={{ background: fill }}>{p.isPlaying ? "⏸" : "▶"}</button>
        <button onClick={p.onNext}>⏭</button>
        <button onClick={p.onLoop} className={p.loop ? "opacity-100" : "opacity-60"}>🔁</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Player/Controls.tsx
git commit -m "feat(player): Controls component"
```

### Task 11.5: Queue panel

**Files:** Create: `src/components/Player/QueuePanel.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/Player/QueuePanel.tsx
"use client";
import { useState } from "react";
import type { Track } from "@/types";

export default function QueuePanel({ queue, index, onPick }: { queue: Track[]; index: number; onPick: (i: number) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="absolute bottom-2 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-white/40 rounded-full" aria-label="open queue" />
      {open && (
        <div className="fixed inset-0 bg-black/60 z-30" onClick={() => setOpen(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-neutral-900 rounded-t-2xl p-4 max-h-[65vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1.5 bg-white/30 rounded-full mx-auto mb-4" />
            <h3 className="text-sm uppercase tracking-wider opacity-60 mb-2">Queue</h3>
            <ul className="flex flex-col gap-2">
              {queue.map((t, i) => (
                <li key={t.id} onClick={() => { onPick(i); setOpen(false); }}
                  className={`flex items-center gap-3 p-2 rounded ${i === index ? "bg-white/10" : ""}`}>
                  <div className="w-10 h-10 rounded bg-white/10 overflow-hidden">
                    {t.thumbnail_url && <img src={t.thumbnail_url.startsWith("http") ? t.thumbnail_url : `/api/r2/${t.thumbnail_url}`} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm">{t.title}</div>
                    <div className="text-xs opacity-60 truncate">{t.artist ?? "—"}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Player/QueuePanel.tsx
git commit -m "feat(player): Queue slide-up panel"
```

### Task 11.6: Player page

**Files:** Create: `src/app/player/page.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/app/player/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Track } from "@/types";
import Vinyl from "@/components/Player/Vinyl";
import Controls from "@/components/Player/Controls";
import QueuePanel from "@/components/Player/QueuePanel";
import { usePlayer } from "@/hooks/usePlayer";
import { useMediaSession } from "@/hooks/useMediaSession";

export default function Player() {
  const sp = useSearchParams();
  const router = useRouter();
  const p = usePlayer();
  const [shuffle, setShuffle] = useState(false);
  const [loop, setLoop] = useState(false);

  useEffect(() => {
    const track = sp.get("track");
    const playlist = sp.get("playlist");
    if (!track) return;
    const load = async () => {
      let tracks: Track[] = [];
      let startIndex = 0;
      if (playlist) {
        const d = await fetch(`/api/playlists/${encodeURIComponent(playlist)}`).then(r => r.json());
        tracks = d.tracks as Track[];
        startIndex = Math.max(0, tracks.findIndex(t => t.id === track));
      } else {
        const one = await fetch(`/api/tracks?limit=500`).then(r => r.json());
        tracks = (one.tracks as Track[]);
        startIndex = tracks.findIndex(t => t.id === track);
      }
      if (shuffle) tracks = shuffleFrom(tracks, startIndex);
      p.setQueue(tracks, startIndex);
      // ping play counter
      fetch(`/api/tracks/${track}/play`, { method: "POST" }).catch(() => {});
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.toString()]);

  useMediaSession(p.current, { play: p.play, pause: p.pause, next: p.next, prev: p.prev, seek: p.seek });

  const bg = p.current?.thumbnail_url
    ? p.current.thumbnail_url.startsWith("http") ? p.current.thumbnail_url : `/api/r2/${p.current.thumbnail_url}`
    : null;

  if (!p.current) return <main className="p-4">Không có bài nào để phát.</main>;

  return (
    <main className="fixed inset-0 overflow-hidden text-white">
      {bg && <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/75" />

      <Vinyl src={bg} playing={p.isPlaying} />

      <div className="absolute top-0 left-0 right-0 flex justify-between items-center px-4 py-3 z-10">
        <button onClick={() => router.back()}>◁</button>
        <span className="text-[10px] tracking-[2px] opacity-80">ĐANG PHÁT</span>
        <button>⋯</button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 z-10">
        <div className="text-center mb-3">
          <h2 className="text-[17px] font-semibold drop-shadow">{p.current.title}</h2>
          <p className="text-xs opacity-85 drop-shadow">{p.current.artist ?? "—"}</p>
        </div>
        <Controls
          isPlaying={p.isPlaying} currentTime={p.currentTime} duration={p.duration}
          onPlayPause={p.toggle} onNext={p.next} onPrev={p.prev} onSeek={p.seek}
          accent={p.current.accent_color}
          shuffle={shuffle} onShuffle={() => setShuffle(v => !v)}
          loop={loop} onLoop={() => setLoop(v => !v)}
        />
      </div>

      <QueuePanel queue={p.queue} index={p.index} onPick={p.moveTo} />
    </main>
  );
}

function shuffleFrom<T>(arr: T[], keep: number): T[] {
  const pinned = arr[keep];
  const rest = arr.filter((_, i) => i !== keep);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [pinned, ...rest];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/player
git commit -m "feat(player): fullscreen player page wiring"
```

---

## Milestone 12 — PWA & Offline

### Task 12.1: Manifest + icons

**Files:** Create: `public/manifest.json`, `public/icons/icon-192.png`, `public/icons/icon-512.png`

- [ ] **Step 1: Write manifest**

```json
{
  "name": "Tokioto",
  "short_name": "Tokioto",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#000000",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: Generate icons**

Use any vinyl/music emoji at 192×192 and 512×512 PNG. Quick approach: use https://favicon.io/ or ImageMagick:
```bash
magick -size 512x512 canvas:black -fill white -gravity center -pointsize 300 -annotate +0+0 "♪" public/icons/icon-512.png
magick public/icons/icon-512.png -resize 192x192 public/icons/icon-192.png
```

- [ ] **Step 3: Commit**

```bash
git add public/manifest.json public/icons
git commit -m "feat(pwa): manifest + icons"
```

### Task 12.2: Service worker with Workbox

**Files:** Modify: `package.json`, `next.config.ts`; Create: `public/sw.js`

- [ ] **Step 1: Minimal hand-rolled SW (no build plugin)**

```js
// public/sw.js
const SHELL = "tokioto-shell-v1";
const AUDIO = "tokioto-audio-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(["/", "/login", "/manifest.json"])));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== AUDIO).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Intercept offline:// audio lookups done by client before stream fetch
  if (url.pathname.startsWith("/api/tracks/") && url.pathname.endsWith("/stream")) return; // pass-through; client handled cache already
  if (url.pathname.startsWith("/api/")) return; // network-only for API
  // Shell: stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request).then(resp => {
        if (resp.ok) caches.open(SHELL).then(c => c.put(event.request, resp.clone()));
        return resp;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
```

- [ ] **Step 2: Register SW in root layout**

Add to `src/app/layout.tsx` body end:
```tsx
<script dangerouslySetInnerHTML={{ __html: `
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
`}} />
```

- [ ] **Step 3: Commit**

```bash
git add public/sw.js src/app/layout.tsx
git commit -m "feat(pwa): service worker + registration"
```

### Task 12.3: Offline cache hook + download button

**Files:** Create: `src/hooks/useOfflineCache.ts`; Modify: `src/app/playlists/[id]/page.tsx`, `src/hooks/usePlayer.ts`

- [ ] **Step 1: Implement hook**

```ts
// src/hooks/useOfflineCache.ts
"use client";

const CACHE = "tokioto-audio-v1";
const key = (id: string) => `offline://audio/${id}`;

export async function cacheTrack(id: string) {
  const cache = await caches.open(CACHE);
  const resp = await fetch(`/api/tracks/${id}/stream`, { redirect: "follow" });
  if (!resp.ok) throw new Error("fetch failed");
  await cache.put(key(id), resp);
}

export async function uncacheTrack(id: string) {
  const cache = await caches.open(CACHE);
  await cache.delete(key(id));
}

export async function hasCached(id: string): Promise<boolean> {
  const cache = await caches.open(CACHE);
  return !!(await cache.match(key(id)));
}

export async function getCached(id: string): Promise<Response | null> {
  const cache = await caches.open(CACHE);
  return (await cache.match(key(id))) ?? null;
}

export async function clearAll() {
  await caches.delete(CACHE);
}

export async function totalSize(): Promise<number> {
  const cache = await caches.open(CACHE);
  const keys = await cache.keys();
  let total = 0;
  for (const k of keys) {
    const r = await cache.match(k);
    if (r) total += Number(r.headers.get("content-length") || 0);
  }
  return total;
}
```

- [ ] **Step 2: Teach usePlayer to use cache**

Replace the src assignment in `src/hooks/usePlayer.ts` `useEffect(..., [current?.id])` with:

```ts
(async () => {
  const a = audioRef.current; if (!a || !current) return;
  const { getCached } = await import("./useOfflineCache");
  const cached = await getCached(current.id);
  a.src = cached ? URL.createObjectURL(await cached.blob()) : `/api/tracks/${current.id}/stream`;
  if (state.isPlaying) a.play().catch(() => {});
})();
```

- [ ] **Step 3: Download button on playlist detail**

Add at top of playlist detail page (inside `main`):
```tsx
{!smart && <OfflineButton ids={tracks.map(t => t.id)} />}
```

Create `src/components/Playlist/OfflineButton.tsx`:
```tsx
"use client";
import { useEffect, useState } from "react";
import { cacheTrack, hasCached, uncacheTrack } from "@/hooks/useOfflineCache";

export default function OfflineButton({ ids }: { ids: string[] }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [cached, setCached] = useState(0);
  useEffect(() => {
    (async () => {
      let c = 0; for (const id of ids) if (await hasCached(id)) c++;
      setCached(c);
    })();
  }, [ids.join(",")]);

  async function downloadAll() {
    setBusy(true); setDone(0);
    for (const id of ids) {
      if (!(await hasCached(id))) await cacheTrack(id).catch(() => {});
      setDone(d => d + 1);
    }
    setBusy(false); setCached(ids.length);
  }

  async function clear() {
    for (const id of ids) await uncacheTrack(id);
    setCached(0);
  }

  if (cached === ids.length && ids.length > 0) {
    return <button onClick={clear} className="text-xs px-3 py-1 rounded bg-white/10">✓ Đã offline — bấm để xoá</button>;
  }
  return <button disabled={busy} onClick={downloadAll} className="text-xs px-3 py-1 rounded bg-white/10 disabled:opacity-40">
    {busy ? `Tải ${done}/${ids.length}…` : "Tải về offline"}
  </button>;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useOfflineCache.ts src/hooks/usePlayer.ts src/components/Playlist/OfflineButton.tsx src/app/playlists/\[id\]/page.tsx
git commit -m "feat(pwa): offline cache hook + download button"
```

---

## Milestone 13 — E2E tests

### Task 13.1: Playwright setup

**Files:** Create: `playwright.config.ts`, `e2e/setup.spec.ts`

- [ ] **Step 1: Install**

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

- [ ] **Step 2: Config**

```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  webServer: { command: "pnpm dev", port: 3000, reuseExistingServer: true, timeout: 120_000 },
});
```

- [ ] **Step 3: Setup test (DB must be empty)**

```ts
// e2e/setup.spec.ts
import { test, expect } from "@playwright/test";

test("first-run setup and login", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveURL(/\/setup$/);
  const dots = [0, 1, 2, 5, 8];
  async function draw() {
    const svg = page.locator("svg").first();
    const box = await svg.boundingBox(); if (!box) throw new Error("no svg");
    const pos = (i: number) => ({ x: box.x + (i % 3) * (box.width / 3) + box.width / 6, y: box.y + Math.floor(i / 3) * (box.height / 3) + box.height / 6 });
    const start = pos(dots[0]);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    for (const d of dots.slice(1)) { const p = pos(d); await page.mouse.move(p.x, p.y, { steps: 10 }); }
    await page.mouse.up();
  }
  await draw(); // first
  await draw(); // confirm
  await expect(page).toHaveURL("/");
});
```

- [ ] **Step 4: Add script**

In `package.json`:
```json
"e2e": "playwright test"
```

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts e2e package.json pnpm-lock.yaml
git commit -m "test(e2e): setup + login flow"
```

---

## Milestone 14 — Deployment

### Task 14.1: Supabase production

- [ ] **Step 1: Create Supabase project** at https://supabase.com (free tier OK).

- [ ] **Step 2: Link + push migrations**

```bash
pnpm supabase link --project-ref <ref>
pnpm supabase db push
```

- [ ] **Step 3: Copy prod keys**

Grab `service_role` key, `anon` key, DB URL, project URL from Supabase dashboard. Keep safe.

### Task 14.2: Cloudflare R2 setup

- [ ] **Step 1: Create bucket** `tokioto` in R2 dashboard. Leave public access off.

- [ ] **Step 2: Create API token** with read+write on the bucket. Save access/secret keys.

### Task 14.3: Deploy worker to Cloud Run

- [ ] **Step 1: Install gcloud CLI and auth**

```bash
gcloud auth login
gcloud config set project <your-gcp-project>
gcloud services enable run.googleapis.com artifactregistry.googleapis.com
```

- [ ] **Step 2: Build and deploy**

```bash
cd worker
gcloud run deploy tokioto-worker \
  --source=. \
  --region=asia-southeast1 \
  --memory=512Mi --cpu=1 --concurrency=1 \
  --min-instances=0 --max-instances=3 \
  --set-env-vars=WORKER_SECRET=<...>,NEXT_PUBLIC_SUPABASE_URL=<...>,SUPABASE_SERVICE_ROLE_KEY=<...>,R2_ACCOUNT_ID=<...>,R2_ACCESS_KEY_ID=<...>,R2_SECRET_ACCESS_KEY=<...>,R2_BUCKET=tokioto \
  --allow-unauthenticated
```

Record the returned URL; that's your `WORKER_URL`.

### Task 14.4: Deploy Next.js to Vercel

- [ ] **Step 1: Connect repo to Vercel** via https://vercel.com/new.

- [ ] **Step 2: Set env vars** in Vercel project settings (all keys from `.env.local.example`).

- [ ] **Step 3: Configure Vercel Cron**

The `vercel.json` already declares the cron. Ensure `CRON_SECRET` env var exists.

- [ ] **Step 4: Install PWA on phone**

Open Vercel URL on phone → Safari/Chrome → Add to Home Screen → launch, login, verify Media Session controls on lock screen while audio plays.

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "chore: deployment configs"
```

---

## Post-plan self-review

**Spec coverage:**
- Auth (setup / login / logout / reset / rate limit / 30-day session) → Milestone 2 + Task 2.11.
- Tracks CRUD + stream + play counter → Milestone 4.
- Playlists + smart playlists + reorder → Milestone 5 + Task 10.3.
- Import jobs + retry + cron → Milestone 6.
- Python worker (yt-dlp, ffmpeg, R2 upload, color) → Milestone 7.
- UI shell + tabs → Milestone 8.
- Library, Import, Playlists pages → Milestones 9–10.
- Player (vinyl, controls, queue) + Media Session → Milestone 11.
- PWA manifest + SW + offline → Milestone 12.
- Error handling: track failure surfaces in Import job history; playback error handled by `audio` element events (future polish — not a blocker for first-run).
- Testing: unit (Vitest) in Milestones 2–3, E2E (Playwright) in Milestone 13.
- Deployment: Milestone 14.

**Placeholder scan:** No TBD/TODO markers. Every step has concrete code or commands.

**Type consistency:** `Track` and `Playlist` types defined once in `src/types/index.ts`; reused across components. Hook names (`usePlayer`, `useMediaSession`, `useOfflineCache`) consistent.

---

## Execution handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-17-tokioto-music-web.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — I execute tasks in this session using `executing-plans`, batch execution with checkpoints.

**Which approach?**
