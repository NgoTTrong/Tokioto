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
    opts: dict[str, Any] = {
        "format": "bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best",
        "outtmpl": f"{base}.%(ext)s",
        "noplaylist": True,
        "quiet": True,
        "postprocessors": [
            {"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "192"},
        ],
        "js_runtimes": {"node": {}},
        "remote_components": ["ejs:github"],
    }
    cookies_file = os.environ.get("YTDLP_COOKIES_FILE")
    if cookies_file and os.path.exists(cookies_file):
        opts["cookiefile"] = cookies_file
    return opts

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
            thumbnail_uploaded = False
            if thumb_url:
                async with httpx.AsyncClient(timeout=30) as http:
                    r = await http.get(thumb_url)
                    if r.status_code == 200:
                        await upload_thumbnail(track_id, r.content)
                        accent = _extract_color(r.content)
                        thumbnail_uploaded = True

        await set_track_ready(track_id, {
            "duration_sec": int(info.get("duration") or 0),
            "title_fallback": info.get("title"),
            "artist_fallback": info.get("uploader"),
            "accent_color": accent,
            "thumbnail_uploaded": thumbnail_uploaded,
        })
        await set_job_done(job_id)
    except Exception as e:
        await set_track_failed(track_id, str(e))
        await set_job_failed(job_id, str(e))
