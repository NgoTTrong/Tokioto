# Deployment

## Prerequisites
- Supabase account (free tier)
- Cloudflare account with R2 enabled
- Google Cloud account with billing enabled
- Vercel account

## 1. Supabase setup

1. Create a new project at https://supabase.com
2. Link and push migrations:
   ```bash
   pnpm supabase link --project-ref <ref>
   pnpm supabase db push
   ```
3. Copy from dashboard: URL, service_role key, DB connection string

## 2. Cloudflare R2 setup

1. Create bucket named `tokioto` (public access OFF)
2. Create API token with read+write on the bucket
3. Note your Account ID, Access Key ID, Secret Access Key

## 3. Worker deployment (Google Cloud Run)

```bash
cd worker
gcloud auth login
gcloud config set project <your-gcp-project>
gcloud services enable run.googleapis.com artifactregistry.googleapis.com
gcloud run deploy tokioto-worker \
  --source=. \
  --region=asia-southeast1 \
  --memory=512Mi --cpu=1 --concurrency=1 \
  --min-instances=0 --max-instances=3 \
  --set-env-vars="WORKER_SECRET=<secret>,NEXT_PUBLIC_SUPABASE_URL=<url>,SUPABASE_SERVICE_ROLE_KEY=<key>,R2_ACCOUNT_ID=<id>,R2_ACCESS_KEY_ID=<key>,R2_SECRET_ACCESS_KEY=<secret>,R2_BUCKET=tokioto" \
  --allow-unauthenticated
```

Record the returned URL → this is your `WORKER_URL`.

## 4. Vercel deployment

1. Connect repo at https://vercel.com/new
2. Set all env vars from `.env.local.example` in Vercel project settings
3. The cron is already configured in `vercel.json` — ensure `CRON_SECRET` is set
4. Deploy

## 5. First-run setup

Open your Vercel URL → navigate to `/setup` → draw your pattern → log in.

## 6. PWA installation

Open on mobile → Safari/Chrome → Add to Home Screen → launch and verify lock screen controls work.
