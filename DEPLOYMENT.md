# Deployment Guide

> **Legend:** 🔧 Manual (one-time) · 🤖 Auto (CI/CD sau khi setup) · ⚠️ Cần làm trước bước tiếp theo

---

## Tổng quan kiến trúc

```
GitHub (main branch)
  ├── push → Vercel (Next.js app)        🤖 tự động
  └── push worker/ → Cloud Run (Worker)  🤖 tự động

Vercel app ←→ Supabase (DB)
Vercel app ←→ Cloudflare R2 (media)
Vercel app ←→ Cloud Run Worker (import jobs)
Vercel cron → /api/cron/retry-queued (mỗi 10 phút)
```

---

## Bước 1 — Supabase 🔧

> ⚠️ Cần hoàn thành trước khi deploy app

1. Tạo project tại https://supabase.com (free tier đủ dùng)
2. Chạy lệnh sau để push schema lên:
   ```bash
   pnpm supabase link --project-ref <project-ref>   # lấy từ URL dashboard
   pnpm supabase db push
   ```
3. Lấy từ **Settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Lấy từ **Settings → Database → Connection string (URI)**:
   - `DATABASE_URL`

---

## Bước 2 — Cloudflare R2 🔧

> ⚠️ Cần hoàn thành trước khi deploy app

1. Vào Cloudflare Dashboard → R2 → **Create bucket** tên `tokioto`
   - Public access: **OFF** (app tự proxy qua `/api/r2/`)
2. Vào **Manage R2 API Tokens** → Create token với quyền **Object Read & Write** cho bucket `tokioto`
3. Ghi lại:
   - `R2_ACCOUNT_ID` (Cloudflare Account ID)
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET` = `tokioto`
   - `R2_PUBLIC_BASE` = để trống (app dùng proxy) hoặc custom domain nếu có

---

## Bước 3 — Đưa code lên GitHub 🔧

```bash
# Tại thư mục E:\Personal\Tokioto
git init
git add .
git commit -m "feat: initial commit"

# Tạo repo trên github.com rồi:
git remote add origin https://github.com/<username>/tokioto.git
git branch -M main
git push -u origin main
```

> **Lưu ý:** Đảm bảo `.env` đã có trong `.gitignore` (không push key lên GitHub)

---

## Bước 4 — Vercel (Next.js app) 🔧

> Sau bước này, mỗi lần `git push main` sẽ **tự động deploy** — không cần làm gì thêm.

1. Vào https://vercel.com/new → Import repo GitHub vừa tạo
2. Framework: **Next.js** (tự detect)
3. Chọn **Environment Variables** → thêm tất cả:

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | từ Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | từ Supabase |
   | `DATABASE_URL` | từ Supabase |
   | `SESSION_SECRET` | random string ≥ 32 ký tự |
   | `R2_ACCOUNT_ID` | từ Cloudflare |
   | `R2_ACCESS_KEY_ID` | từ Cloudflare |
   | `R2_SECRET_ACCESS_KEY` | từ Cloudflare |
   | `R2_BUCKET` | `tokioto` |
   | `R2_PUBLIC_BASE` | (bỏ trống hoặc custom domain R2) |
   | `WORKER_URL` | điền sau ở Bước 5 |
   | `WORKER_SECRET` | random string ≥ 32 ký tự (tự đặt) |
   | `CRON_SECRET` | random string ≥ 32 ký tự (tự đặt) |

4. Nhấn **Deploy**
5. Lưu lại **Production URL** (vd: `https://tokioto.vercel.app`)

> Cron job `vercel.json` (retry import mỗi 10 phút) sẽ tự chạy trên Vercel — không cần setup thêm.

---

## Bước 5 — Google Cloud Run (Worker) 🔧

> Worker xử lý download nhạc từ YouTube, cần ffmpeg → dùng Cloud Run với Docker.

### 5a. Cài gcloud CLI (nếu chưa có)
```bash
# Windows: https://cloud.google.com/sdk/docs/install
gcloud auth login
gcloud config set project <your-gcp-project-id>
gcloud services enable run.googleapis.com artifactregistry.googleapis.com
```

### 5b. Deploy lần đầu (thủ công)
```bash
cd worker
gcloud run deploy tokioto-worker \
  --source=. \
  --region=asia-southeast1 \
  --memory=512Mi --cpu=1 \
  --concurrency=1 \
  --min-instances=0 --max-instances=3 \
  --allow-unauthenticated \
  --set-env-vars="\
WORKER_SECRET=<worker-secret>,\
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>,\
SUPABASE_SERVICE_ROLE_KEY=<supabase-key>,\
R2_ACCOUNT_ID=<r2-account-id>,\
R2_ACCESS_KEY_ID=<r2-key-id>,\
R2_SECRET_ACCESS_KEY=<r2-secret>,\
R2_BUCKET=tokioto"
```

Lưu lại URL trả về (dạng `https://tokioto-worker-xxx-as.a.run.app`) → điền vào `WORKER_URL` trên Vercel.

### 5c. Cập nhật WORKER_URL vào Vercel
Vercel Dashboard → Project → Settings → Environment Variables → sửa `WORKER_URL`.

Sau đó **Redeploy** lần nữa để app nhận giá trị mới.

---

## Bước 6 — CI/CD Worker (tự động deploy khi push) 🔧

> Sau bước này, sửa code trong `worker/` → push → Cloud Run tự update.

### 6a. Tạo Service Account cho GitHub Actions
```bash
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Deploy"

gcloud projects add-iam-policy-binding <project-id> \
  --member="serviceAccount:github-actions@<project-id>.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding <project-id> \
  --member="serviceAccount:github-actions@<project-id>.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding <project-id> \
  --member="serviceAccount:github-actions@<project-id>.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.admin"

gcloud projects add-iam-policy-binding <project-id> \
  --member="serviceAccount:github-actions@<project-id>.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

# Tạo key JSON
gcloud iam service-accounts keys create gcp-key.json \
  --iam-account=github-actions@<project-id>.iam.gserviceaccount.com
```

### 6b. Thêm GitHub Secrets
Vào **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|--------|-------|
| `GCP_SA_KEY` | toàn bộ nội dung file `gcp-key.json` |
| `WORKER_SECRET` | giống giá trị đã set ở Bước 5 |
| `NEXT_PUBLIC_SUPABASE_URL` | giống Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | giống Vercel |
| `R2_ACCOUNT_ID` | giống Vercel |
| `R2_ACCESS_KEY_ID` | giống Vercel |
| `R2_SECRET_ACCESS_KEY` | giống Vercel |
| `R2_BUCKET` | `tokioto` |

> **Xóa file `gcp-key.json` sau khi copy xong** — không commit lên git!

```bash
del gcp-key.json   # hoặc rm gcp-key.json
```

---

## Bước 7 — First-run Setup 🔧

1. Mở URL Vercel → `/setup`
2. Vẽ pattern mới để đặt mật khẩu
3. Đăng nhập và thử import 1 bài nhạc để verify toàn bộ pipeline

---

## Bước 8 — Cài PWA lên điện thoại 🔧

**Android (Chrome):**
Mở URL → menu ⋮ → "Add to Home screen"

**iOS (Safari):**
Mở URL → nút Share → "Add to Home Screen"

---

## Sau khi setup xong — CI/CD Flow 🤖

```
git add .
git commit -m "feat: ..."
git push origin main
         │
         ├─ Vercel detects push → build Next.js → deploy (~ 1 phút)
         │
         └─ GitHub Actions detects worker/ changes
              → build Docker → push → Cloud Run deploy (~ 3 phút)
```

**Không cần làm gì thêm.** Mỗi lần push là app update tự động.

---

## Tóm tắt những gì cần can thiệp thủ công

| # | Việc cần làm | Một lần duy nhất? |
|---|---|---|
| 1 | Tạo Supabase project + push migrations | ✅ |
| 2 | Tạo Cloudflare R2 bucket + API token | ✅ |
| 3 | Push code lên GitHub | ✅ |
| 4 | Connect repo vào Vercel + điền env vars | ✅ |
| 5 | Deploy worker lần đầu bằng gcloud | ✅ |
| 6 | Tạo GCP Service Account + thêm GitHub Secrets | ✅ |
| 7 | Vào `/setup` để set pattern | ✅ |
| 8 | Cài PWA lên điện thoại | ✅ |

**Từ đây về sau: `git push` là xong.**
