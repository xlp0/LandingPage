# Quick Setup Guide: Grafana Metrics Collector

## 🚀 Setup dalam 5 Menit

### Step 1: Tambah GitHub Secrets

1. Buka repository di GitHub: https://github.com/[your-username]/LandingPage
2. Click **Settings** (tab paling kanan)
3. Di sidebar kiri, click **Secrets and variables** → **Actions**
4. Click tombol **New repository secret**

### Step 2: Tambah Secrets Satu Per Satu

#### Secret 1: GRAFANA_USERNAME
- **Name:** `GRAFANA_USERNAME`
- **Value:** `admin`
- Click **Add secret**

#### Secret 2: GRAFANA_PASSWORD
- **Name:** `GRAFANA_PASSWORD`
- **Value:** `r8RKaVP3rzJe6MsuloQv9B4G2UPzSe387DMpOY0r`
- Click **Add secret**

#### Secret 3: MINIO_ACCESS_KEY
- **Name:** `MINIO_ACCESS_KEY`
- **Value:** [Your MinIO Access Key - cari di MinIO console atau tanya admin]
- Click **Add secret**

#### Secret 4: MINIO_SECRET_KEY
- **Name:** `MINIO_SECRET_KEY`
- **Value:** [Your MinIO Secret Key - cari di MinIO console atau tanya admin]
- Click **Add secret**

### Step 3: Verify Secrets

Pastikan semua 4 secrets sudah muncul di list:
```
✅ GRAFANA_USERNAME
✅ GRAFANA_PASSWORD
✅ MINIO_ACCESS_KEY
✅ MINIO_SECRET_KEY
```

### Step 4: Test Run Workflow

1. Buka tab **Actions** di repository
2. Click workflow **"Grafana Metrics Collector"** di sidebar kiri
3. Click tombol **"Run workflow"** (dropdown button di kanan)
4. Pilih branch: `main`
5. (Optional) Ubah time range: default `1h` sudah OK
6. Click tombol hijau **"Run workflow"**

### Step 5: Check Results

1. Tunggu ~1-2 menit
2. Refresh page untuk lihat status
3. Click pada workflow run yang baru (paling atas)
4. Check setiap step:
   - ✅ Checkout repository
   - ✅ Set up Python
   - ✅ Install Python dependencies
   - ✅ Create metrics directory
   - ✅ Collect ZITADEL metrics from Grafana
   - ✅ Upload metrics to MinIO
   - ✅ Upload artifacts

### Step 6: Download & Verify Data

#### Option A: Download dari GitHub Artifacts
1. Scroll ke bawah di workflow run page
2. Section "Artifacts"
3. Click `grafana-metrics-<run-id>` untuk download
4. Extract ZIP file
5. Buka `latest_summary.json` untuk lihat summary

#### Option B: Check di MinIO
1. Login ke MinIO console: https://minio.pkc.pub
2. Buka bucket `grafana-metrics`
3. Navigate ke folder: `2026/01/14/` (sesuai tanggal hari ini)
4. Download file `zitadel_metrics_*.json`

## 🔍 Troubleshooting

### ❌ Error: "GRAFANA_PASSWORD environment variable not set"
**Fix:** Secret belum ditambahkan atau salah nama. Pastikan nama secret EXACT: `GRAFANA_PASSWORD`

### ❌ Error: "Failed to login to Grafana"
**Fix:** 
1. Test credentials manual:
   ```bash
   curl -u admin:r8RKaVP3rzJe6MsuloQv9B4G2UPzSe387DMpOY0r \
        https://grafana.pkc.pub/api/health
   ```
2. Jika gagal, password mungkin sudah berubah. Check dengan admin.

### ❌ Error: "Failed to connect to MinIO"
**Fix:**
1. Verify MinIO credentials
2. MinIO di belakang reverse proxy - gunakan URL standard tanpa port
3. Test connection dengan AWS CLI:
   ```bash
   aws configure set aws_access_key_id YOUR_ACCESS_KEY
   aws configure set aws_secret_access_key YOUR_SECRET_KEY
   aws s3 ls --endpoint-url https://minio.pkc.pub
   ```

### ⚠️ Warning: "No data for [metric_name]"
**Not an error!** Beberapa metrics mungkin tidak available tergantung ZITADEL configuration. Workflow tetap sukses selama minimal ada 1 metric yang berhasil diambil.

## 📊 What's Next?

1. **Automatic Collection:** Workflow akan berjalan otomatis setiap jam
2. **Monitor Runs:** Check tab Actions regularly untuk ensure workflow running smoothly
3. **Analyze Data:** Download metrics files untuk analysis
4. **Customize:** Edit queries di `collect_grafana_metrics.py` untuk add more metrics

## 🎯 Success Criteria

Workflow berhasil jika:
- ✅ All steps completed (green checkmarks)
- ✅ Artifacts uploaded (terlihat di workflow run)
- ✅ Files muncul di MinIO bucket
- ✅ `latest_summary.json` shows `metrics_collected > 0`

## 📞 Need Help?

Check dokumentasi lengkap: `.github/workflows/README-GRAFANA-METRICS.md`
