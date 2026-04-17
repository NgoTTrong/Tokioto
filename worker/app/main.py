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
