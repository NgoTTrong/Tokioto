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
