# Tokioto — Personal Music Web App Design

**Date:** 2026-04-17
**Status:** Draft, awaiting implementation plan

## Overview

A personal music web app for a single user. The user pastes a YouTube or SoundCloud link, the server extracts the audio file + metadata, stores the audio in Cloudflare R2, and plays it back through a vinyl-style player UI. Mobile-first with PWA background playback. Auth is a 9-dot pattern lock.

## Goals

- Import audio from YouTube and SoundCloud URLs (paste → metadata preview → edit → save).
- Play audio on mobile with the screen off (PWA + Media Session API).
- Vinyl-style player: thumbnail as fullscreen background; vinyl disc in the center uses the same thumbnail and physically rotates during playback, aligning seamlessly with the background when paused.
- Create and manage playlists (manual + smart: All / Recently Added / Most Played).
- Single-user 9-dot pattern login.
- Manual per-playlist offline caching.

## Non-Goals

- Spotify audio extraction (DRM-protected, dropped from scope).
- Multi-user, sharing, or social features.
- AI recommendations / radio mode / discovery.
- Lyrics, music videos, artist pages.
- Admin dashboard beyond a CLI reset script.

## Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend + API | Next.js 15 (App Router, TypeScript) on Vercel | Single deploy, API routes handle CRUD + auth |
| Styling | Tailwind CSS | Fast iteration on theming |
| Database | Supabase (Postgres) | Hosted Postgres + Realtime (for import job status) |
| Object storage | Cloudflare R2 | Cheap, S3-compatible, zero egress |
| Worker (audio extract) | Python + FastAPI + yt-dlp on **Google Cloud Run** | Serverless, scales to zero, free tier covers single-user workload; yt-dlp is the reliable extractor |
| Auth | Custom 9-dot pattern + bcrypt + JWT session cookie | 1 user only, no OAuth needed |
| Package manager | pnpm | Requested by user |

## Architecture

```
┌─────────────────────────┐
│   Next.js (Vercel)      │  Frontend + API routes
│   React + TS + Tailwind │  PWA (manifest + service worker)
└───────┬─────────────────┘
        │ REST
        ▼
┌─────────────────────────┐
│   Supabase (Postgres)   │  users, tracks, playlists,
│                         │  playlist_tracks, import_jobs,
│                         │  sessions
└─────────────────────────┘
        ▲
        │ enqueue (HTTP POST with shared secret)
        │
┌───────┴─────────────────┐         ┌────────────────────┐
│   Cloud Run Worker      │────────▶│  Cloudflare R2     │
│   Python + FastAPI      │  upload │  - audio (mp3)     │
│   yt-dlp                │         │  - thumbnails      │
└─────────────────────────┘         └────────────────────┘
```

### Data flow: import a track

1. User pastes link in `/import` tab. Frontend calls `POST /api/tracks/preview` which returns `{ title, artist, thumbnail_url, duration, source, source_id }` derived from oEmbed (YouTube) or SoundCloud resolve API.
2. User optionally edits title, artist, uploads a custom thumbnail. Clicks **Add**.
3. Frontend calls `POST /api/tracks` with final metadata + source URL. Next.js:
   - Inserts `tracks` row with `status='pending'`.
   - Inserts `import_jobs` row with `status='queued'`.
   - HTTP POSTs to Cloud Run `/extract` (shared-secret header) with `{ job_id, track_id, source_url }`. Fire-and-forget (worker returns 202 immediately, processes async).
4. Worker downloads audio via yt-dlp → transcodes to 192kbps MP3 → uploads to R2 at `audio/{track_id}.mp3`. Uploads thumbnail (if not user-provided) to `thumbnails/{track_id}.jpg`. Updates `tracks.status='ready'`, `tracks.r2_key`, `tracks.duration_sec` via Supabase client. Updates `import_jobs.status='done'`.
5. Frontend subscribes to Supabase Realtime on `tracks` (or polls every 3s) → when status flips to `ready`, the track appears in Library.

### Data flow: play a track

1. User taps a track → player opens, calls `GET /api/tracks/{id}/stream`.
2. Next.js generates a 1-hour pre-signed R2 URL and returns a 302 redirect.
3. `<audio src>` plays from the pre-signed URL. Browser handles range requests directly against R2.
4. On `play` event, client calls `POST /api/tracks/{id}/play` (fire-and-forget) to increment `played_count` and update `last_played_at`.

## Database schema

```sql
users (
  id             uuid PRIMARY KEY,
  pattern_hash   text NOT NULL,         -- bcrypt(12) of normalized pattern "0-1-2-5-8"
  failed_attempts int  DEFAULT 0,
  locked_until   timestamptz,
  created_at     timestamptz DEFAULT now()
)

tracks (
  id             uuid PRIMARY KEY,
  source         text NOT NULL,          -- 'youtube' | 'soundcloud'
  source_url     text,
  source_id      text,                   -- for dedupe
  title          text NOT NULL,
  artist         text,
  duration_sec   int,
  thumbnail_url  text,                   -- R2 key
  r2_key         text,                   -- audio R2 key, null while pending
  accent_color   text,                   -- hex, extracted from thumbnail once ready
  status         text NOT NULL,          -- 'pending'|'processing'|'ready'|'failed'
  error_message  text,
  added_at       timestamptz DEFAULT now(),
  played_count   int DEFAULT 0,
  last_played_at timestamptz,
  UNIQUE (source, source_id)
)

playlists (
  id            uuid PRIMARY KEY,
  name          text NOT NULL,
  description   text,
  thumbnail_url text,                    -- null = render a 2×2 collage client-side from the first 4 tracks' thumbnails
  created_at    timestamptz DEFAULT now()
)

playlist_tracks (
  playlist_id  uuid REFERENCES playlists(id) ON DELETE CASCADE,
  track_id     uuid REFERENCES tracks(id)    ON DELETE CASCADE,
  position     int  NOT NULL,
  added_at     timestamptz DEFAULT now(),
  PRIMARY KEY (playlist_id, track_id)
)

import_jobs (
  id             uuid PRIMARY KEY,
  track_id       uuid REFERENCES tracks(id) ON DELETE CASCADE,
  source_url     text NOT NULL,
  status         text NOT NULL,          -- 'queued'|'running'|'done'|'failed'
  error_message  text,
  created_at     timestamptz DEFAULT now(),
  finished_at    timestamptz
)

sessions (
  id          uuid PRIMARY KEY,
  token_hash  text NOT NULL,             -- sha256 of JWT for revocation
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz DEFAULT now()
)
```

Smart playlists are virtual views computed from `tracks`:
- **All songs**: `WHERE status='ready'` ordered by `title`.
- **Recently added**: `WHERE status='ready'` ordered by `added_at DESC LIMIT 50`.
- **Most played**: `WHERE status='ready' AND played_count > 0` ordered by `played_count DESC LIMIT 50`.

## Routes & API

### Pages
- `/setup` — one-time pattern setup; locked forever after first user created.
- `/login` — pattern entry.
- `/` — Library tab (default after login).
- `/playlists`, `/playlists/[id]` — Playlists tab.
- `/import` — Import tab (input + job history).
- `/player` — fullscreen player (opened as overlay/route from any tab).

### API
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/setup` | Create pattern (only when no user exists) |
| POST | `/api/auth/login` | Verify pattern, set cookie |
| POST | `/api/auth/logout` | Revoke session |
| GET | `/api/tracks` | List tracks (filter, sort, paginate) |
| POST | `/api/tracks` | Create track + enqueue job |
| POST | `/api/tracks/preview` | Return oEmbed metadata for a URL |
| PATCH | `/api/tracks/[id]` | Update title/artist/thumbnail |
| DELETE | `/api/tracks/[id]` | Delete record + R2 objects |
| GET | `/api/tracks/[id]/stream` | 302 redirect to pre-signed R2 URL |
| POST | `/api/tracks/[id]/play` | Increment play counter |
| GET | `/api/playlists` | List (includes smart playlists) |
| POST | `/api/playlists` | Create |
| PATCH | `/api/playlists/[id]` | Update |
| DELETE | `/api/playlists/[id]` | Delete |
| POST | `/api/playlists/[id]/tracks` | Add track |
| DELETE | `/api/playlists/[id]/tracks/[tid]` | Remove track |
| PUT | `/api/playlists/[id]/reorder` | Reorder (new position array) |
| GET | `/api/import-jobs` | Job history |
| POST | `/api/import-jobs/[id]/retry` | Retry failed job |
| POST | `/api/cron/retry-queued` | Vercel Cron: re-dispatch jobs still queued >2 min (protected by `CRON_SECRET`) |

### Worker (Cloud Run)
| Method | Path | Purpose |
|---|---|---|
| POST | `/extract` | Accept `{ job_id, track_id, source_url }`, process async |
| GET | `/health` | Health probe |

Worker requires `X-Worker-Secret` header matching shared secret env var.

## Authentication (9-dot pattern)

### UI
- Canvas/SVG 3×3 grid of dots.
- User drags to connect ≥ 4 dots. A dot is consumed once; skipping over a non-consumed dot auto-adds it ("line-through rule" like Android).
- Visual feedback: line draws as finger moves; dots glow when entered; completing a valid pattern submits automatically.

### Server-side
- Sequence normalized to `"0-1-2-5-8"` then bcrypt(12) hashed.
- Verify: same normalization → `bcrypt.compare` against stored `pattern_hash`.

### Rate limiting
- Before verify, check `locked_until`. If `now() < locked_until`, return 423 with retry-after.
- Wrong attempt: `failed_attempts += 1`. On hitting 5: `locked_until = now() + interval '5 minutes'`, reset `failed_attempts = 0`.
- Correct attempt: both fields reset.

### Session
- JWT signed with `SESSION_SECRET` env var, payload `{ sid, exp }`.
- Cookie: `HttpOnly`, `Secure`, `SameSite=Lax`, `Max-Age = 30 days`.
- `sessions` row stores `sha256(jwt)` as `token_hash` + `expires_at`. Each request verifies JWT *and* that the session row still exists (allows server-side logout/revoke).

### Recovery
- `scripts/reset-pattern.ts` (local CLI). Reads `DATABASE_URL`, prompts for a new pattern sequence in terminal, updates `users.pattern_hash`. No web endpoint.

### Setup guard
- If `users` is empty, all routes except `/setup` redirect there.
- `POST /api/auth/setup` refuses if a user already exists (prevents accidental overwrite).

## Player UX

### Visual spec
- Fullscreen. Background: `<img>` with `object-fit: cover` showing `thumbnail_url`.
- Dark linear gradient overlays at top (25% opacity → 0) and bottom (0 → 75% opacity) for text legibility.
- Vinyl disc: absolutely positioned 50%/50%, 70% of container width, perfect circle, same thumbnail as background aligned pixel-perfect (`background-size: cover` at matching coordinates). Disc rotates via CSS `@keyframes` at ~12s/rev when playing; transitions to 0° on pause.
- Disc overlay: radial-gradient grooves + center spindle hole.
- Seamless alignment: when disc is at 0° rotation (paused), its pixels line up with the background such that the disc appears as a circular highlight of the background image. When rotating, the disc content rotates with the element.

### Controls (bottom area)
- Title, artist.
- Progress bar (tap/drag to seek), elapsed / -remaining.
- Buttons: shuffle · previous · play/pause (large, circular, white) · next · loop.
- Top-right `⋯` menu: edit metadata, copy source URL, add to playlist, delete, download offline.

### Queue panel
- Handle at bottom center. Swipe up or tap → slides up to ~60% screen height with backdrop dim.
- Shows the current queue (ordered list) with thumb, title, artist. Drag-reorder; tap to jump.
- Second tab in the panel: "From playlist" shows the playlist context if player was started from one.

### Dynamic theming
- Beyond the thumbnail-as-background approach, extract one dominant color and cache it in `tracks.accent_color`. The worker computes this after downloading the thumbnail (Python `colorthief` library) and writes it alongside the other track fields when flipping status to `ready`. The client uses this color to tint the progress bar fill and play button when the default white would clash (e.g., thumbnail with a white center).

## PWA & mobile background playback

- `manifest.json`: `name`, icons (192/512), `display: standalone`, `start_url: /`.
- Service worker (Workbox):
  - Precache app shell.
  - Runtime cache `/api/tracks`, `/api/playlists`: stale-while-revalidate.
  - Auth endpoints: network-only.
  - Audio stream URLs: **bypass** service worker entirely — let the browser handle HTTP range requests directly against R2.
- Media Session API: on track change, set `navigator.mediaSession.metadata = { title, artist, artwork: [{ src: thumbnail_url }] }` and handlers for play/pause/previoustrack/nexttrack/seekto. This surfaces native lock-screen controls on iOS/Android.
- Audio element: standard `<audio>` with `preload="metadata"`. Background playback works as long as a user gesture started playback and the PWA is installed.

## Offline playback (manual, per playlist)

- "Download for offline" button on each playlist.
- Click → for each track in the playlist: `fetch` the R2 pre-signed URL, store response in the Cache API under key `tokioto-audio-v1` with request URL `offline://{track_id}`.
- Playback: before creating pre-signed URL, client checks Cache API for `offline://{track_id}`. If present, serve directly; otherwise fall through to `/api/tracks/{id}/stream`.
- UI indicators: ✓ badge on playlist when all tracks cached; "Offline" label on individual tracks.
- Settings page: total offline size, "Clear all offline" button.

## Error handling

- **Import fails** (video removed, geo-blocked): job status=failed, error_message populated, UI shows toast in Import tab + "Retry" button.
- **Stream 403/404**: player shows "Playback error" overlay, auto-skips to next track after 3s.
- **Worker unreachable**: track stays `pending`. Import tab shows a warning on any job whose `status='queued'` and `created_at` is older than 60 seconds. User can hit retry manually; a Vercel Cron at `/api/cron/retry-queued` (every 10 min) re-dispatches jobs still queued >2 min to the worker.
- **R2 upload fails in worker**: retry 3× with exponential backoff (2s, 4s, 8s), then mark failed.
- **Duplicate import** (`(source, source_id)` unique violation): return the existing track record with a 200 + flag `{ alreadyExists: true }`.

## Testing

- **Unit (Vitest)**: pattern normalization/hashing, URL parser (YouTube vs SoundCloud detection + ID extraction), playlist reorder logic, thumbnail composition logic.
- **API integration**: Vitest + `@supabase/supabase-js` against a local Supabase stack; seed DB, exercise each route.
- **Worker (pytest)**: mock `yt-dlp` with fixture mp3; verify upload path, metadata parsing, error paths.
- **E2E (Playwright)**: flow — setup pattern → login → import YouTube URL (worker stubbed) → play → add to playlist → download offline → kill network → play from cache. Runs on CI against preview deployment.
- **Manual**: all UI polish (vinyl rotation smoothness, lock-screen controls, PWA install on a real phone) — single user, manual testing is enough.

## Deployment

- **Vercel** (Next.js): env vars `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `WORKER_URL`, `WORKER_SECRET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.
- **Cloud Run** (worker): Dockerfile with Python 3.12 + `yt-dlp` + `ffmpeg` + FastAPI. Env vars `SUPABASE_SERVICE_ROLE_KEY`, `WORKER_SECRET`, R2 creds. Memory 512MB, CPU 1, concurrency 1, min instances 0, max 3.
- **Supabase**: migrations committed to repo; applied via `supabase db push` on deploy.
- **R2 bucket**: public access disabled; all access via pre-signed URLs generated by Next.js.

## Out-of-scope / future ideas

- Lyrics fetching (syncedlyrics/genius).
- Playlist sharing via read-only link.
- Automatic re-download if a R2 file goes missing.
- Import from a YouTube playlist URL (expand into individual tracks).
- Waveform visualizer instead of / alongside the vinyl.
