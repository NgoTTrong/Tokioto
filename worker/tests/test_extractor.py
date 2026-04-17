import pytest
from unittest.mock import patch, MagicMock
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
