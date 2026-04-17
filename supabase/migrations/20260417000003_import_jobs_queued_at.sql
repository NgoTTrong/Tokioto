alter table import_jobs add column queued_at timestamptz not null default now();
