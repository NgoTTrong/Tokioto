create or replace function increment_play(p_track_id uuid)
returns void language sql as $$
  update tracks
  set played_count = played_count + 1, last_played_at = now()
  where id = p_track_id;
$$;
