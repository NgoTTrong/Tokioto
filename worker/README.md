# Tokioto Worker

FastAPI + yt-dlp worker for audio extraction. Runs on Google Cloud Run.

## Local run

```bash
# From worker/ directory
pip install -e ".[dev]"
export WORKER_SECRET=localsecret
export NEXT_PUBLIC_SUPABASE_URL=<from pnpm supabase status>
export SUPABASE_SERVICE_ROLE_KEY=<from pnpm supabase status>
export R2_ACCOUNT_ID=<your>
export R2_ACCESS_KEY_ID=<your>
export R2_SECRET_ACCESS_KEY=<your>
export R2_BUCKET=tokioto
uvicorn app.main:app --reload --port 8080
```

Health check: `curl http://localhost:8080/health` → `{"ok":true}`

Set in Next.js `.env.local`: `WORKER_URL=http://localhost:8080`, `WORKER_SECRET=localsecret`
