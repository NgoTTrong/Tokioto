import os
from functools import lru_cache
from supabase import create_client
from datetime import datetime, timezone

@lru_cache(maxsize=1)
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
    if not row.get("thumbnail_url") and fields.get("thumbnail_uploaded"):
        patch["thumbnail_url"] = f"thumbnails/{track_id}.jpg"
    db.table("tracks").update(patch).eq("id", track_id).execute()

async def set_track_failed(track_id: str, msg: str):
    _db().table("tracks").update({"status": "failed", "error_message": msg}).eq("id", track_id).execute()
