# Setup Google Calendar untuk GitHub Actions

Panduan lengkap setup Google Service Account untuk workflow Daily Commit Summary.

## 📋 Prerequisites

- Google Account
- Access ke Google Cloud Console
- Repository GitHub dengan admin access

## 🔐 Step 1: Buat Google Cloud Project

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Klik dropdown project di top bar
3. Klik "New Project"
4. Isi:
   - **Project name**: `github-actions-calendar` (atau nama lain)
   - **Organization**: (optional)
5. Klik "Create"
6. Tunggu project dibuat (~30 detik)

## 🔌 Step 2: Enable Google Calendar API

1. Di Cloud Console, pastikan project yang benar dipilih
2. Navigation Menu (☰) → **APIs & Services** → **Library**
3. Search: `Google Calendar API`
4. Klik **Google Calendar API**
5. Klik **Enable**
6. Tunggu API enabled (~10 detik)

## 👤 Step 3: Buat Service Account

1. Navigation Menu (☰) → **IAM & Admin** → **Service Accounts**
2. Klik **+ Create Service Account**
3. **Service account details**:
   - **Service account name**: `github-actions-calendar`
   - **Service account ID**: `github-actions-calendar` (auto-generated)
   - **Description**: `Service account for GitHub Actions to create calendar events`
4. Klik **Create and Continue**
5. **Grant this service account access to project** (optional):
   - Skip this step (tidak perlu role)
   - Klik **Continue**
6. **Grant users access to this service account** (optional):
   - Skip this step
   - Klik **Done**

## 🔑 Step 4: Buat Service Account Key

1. Di halaman Service Accounts, klik service account yang baru dibuat
2. Tab **Keys**
3. Klik **Add Key** → **Create new key**
4. Pilih **Key type**: **JSON**
5. Klik **Create**
6. File JSON akan otomatis ter-download
7. **PENTING**: Simpan file ini dengan aman! Jangan share atau commit ke Git!

File JSON akan terlihat seperti ini:
```json
{
  "type": "service_account",
  "project_id": "github-actions-calendar-xxxxx",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n",
  "client_email": "github-actions-calendar@github-actions-calendar-xxxxx.iam.gserviceaccount.com",
  "client_id": "123456789...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

**Catat `client_email`** - Anda akan membutuhkannya di step berikutnya!

## 📅 Step 5: Share Calendar dengan Service Account

1. Buka [Google Calendar](https://calendar.google.com/)
2. Di sidebar kiri, cari calendar yang ingin digunakan
3. Hover di calendar name → klik **⋮** (three dots) → **Settings and sharing**
4. Scroll ke section **Share with specific people or groups**
5. Klik **+ Add people and groups**
6. Masukkan **service account email** dari step 4:
   ```
   github-actions-calendar@github-actions-calendar-xxxxx.iam.gserviceaccount.com
   ```
7. Pilih permission: **Make changes to events**
8. **JANGAN centang** "Send email notification"
9. Klik **Send**

## 🆔 Step 6: Dapatkan Calendar ID

Masih di halaman Settings calendar yang sama:

1. Scroll ke section **Integrate calendar**
2. Copy **Calendar ID**
   - Untuk calendar pribadi: biasanya email Anda
   - Untuk calendar baru: format `xxxxx@group.calendar.google.com`
   - Untuk primary calendar: gunakan `primary`

Contoh:
```
your-email@gmail.com
atau
abc123xyz@group.calendar.google.com
atau
primary
```

## 🔒 Step 7: Setup GitHub Secrets

1. Buka repository GitHub Anda
2. **Settings** → **Secrets and variables** → **Actions**
3. Klik **New repository secret**

### Secret 1: GOOGLE_SERVICE_ACCOUNT_KEY

- **Name**: `GOOGLE_SERVICE_ACCOUNT_KEY`
- **Secret**: Paste **seluruh isi** file JSON dari Step 4
  
  ```json
  {
    "type": "service_account",
    "project_id": "...",
    "private_key_id": "...",
    "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
    "client_email": "...",
    ...
  }
  ```

- Klik **Add secret**

### Secret 2: GOOGLE_CALENDAR_ID

- **Name**: `GOOGLE_CALENDAR_ID`
- **Secret**: Calendar ID dari Step 6
  
  ```
  your-email@gmail.com
  ```
  atau
  ```
  abc123xyz@group.calendar.google.com
  ```

- Klik **Add secret**

## ✅ Step 8: Verifikasi Setup

### Test 1: Manual Workflow Run

1. Go to **Actions** tab di GitHub repository
2. Pilih workflow **"Daily Commit Summary to Google Calendar"**
3. Klik **Run workflow** dropdown
4. Pilih branch (biasanya `main` atau `master`)
5. Klik **Run workflow**
6. Tunggu workflow selesai (~2-3 menit)
7. Cek status:
   - ✅ Green checkmark = Success
   - ❌ Red X = Failed (klik untuk lihat logs)

### Test 2: Check Calendar

1. Buka [Google Calendar](https://calendar.google.com/)
2. Pilih calendar yang di-share dengan service account
3. Cari event dengan:
   - 📝 Icon atau prefix di title
   - Tanggal: Kemarin (karena workflow memproses commit kemarin)
   - Description: Ringkasan commit dari AI

### Test 3: Local Testing (Optional)

Jika Anda punya Ollama di local:

```bash
cd /path/to/repository
.github/scripts/test-commit-summary.sh
```

Script ini akan:
- Collect commits dari kemarin
- Process dengan Ollama llama3.2
- Generate summary
- Show preview (tidak create event di calendar)

## 🔧 Troubleshooting

### Error: "Permission denied" atau "Calendar not found"

**Penyebab**: Service account belum di-share ke calendar

**Solusi**:
1. Verifikasi email service account benar
2. Re-share calendar dengan permission "Make changes to events"
3. Tunggu 1-2 menit untuk propagasi
4. Retry workflow

### Error: "Invalid credentials"

**Penyebab**: JSON key tidak valid atau expired

**Solusi**:
1. Generate new key di Google Cloud Console
2. Update secret `GOOGLE_SERVICE_ACCOUNT_KEY` di GitHub
3. Retry workflow

### Error: "API not enabled"

**Penyebab**: Google Calendar API belum di-enable

**Solusi**:
1. Buka Google Cloud Console
2. APIs & Services → Library
3. Enable Google Calendar API
4. Retry workflow

### Workflow success tapi tidak ada event di calendar

**Penyebab**: Mungkin tidak ada commit kemarin

**Solusi**:
1. Check workflow logs - cari "No commits found"
2. Jika benar tidak ada commit, ini normal
3. Workflow akan skip create event
4. Test dengan manual run atau tunggu hari berikutnya

### AI response tidak valid

**Penyebab**: Model AI kadang memberikan format yang tidak sesuai

**Solusi**:
- Workflow punya fallback mechanism
- Event tetap akan dibuat dengan format default
- Check artifacts di workflow run untuk lihat raw AI response

## 📊 Monitoring

### View Workflow Runs

1. **Actions** tab → **Daily Commit Summary to Google Calendar**
2. Klik run untuk lihat details
3. Klik job "summarize-commits" untuk lihat logs
4. Download artifacts untuk debugging

### Artifacts yang tersimpan:

- `commits.txt`: Raw commit data
- `summary.json`: AI-generated summary
- `prompt.txt`: Prompt yang dikirim ke AI

Retention: 30 hari

## 🎯 Best Practices

1. **Security**:
   - Jangan commit service account key ke Git
   - Gunakan GitHub Secrets untuk credentials
   - Rotate keys secara berkala (setiap 90 hari)

2. **Calendar Organization**:
   - Buat calendar khusus untuk automated events
   - Gunakan color coding (workflow set blue by default)
   - Review events secara berkala

3. **Monitoring**:
   - Enable GitHub Actions notifications
   - Check calendar weekly untuk verify events
   - Review AI summaries untuk quality

4. **Cost**:
   - Google Calendar API: **FREE** (no quota limits for basic usage)
   - GitHub Actions: **FREE** untuk public repos, limited minutes untuk private
   - Ollama: **FREE** (runs on GitHub runner)

## 📚 Additional Resources

- [Google Calendar API Docs](https://developers.google.com/calendar/api/v3/reference)
- [Service Account Guide](https://cloud.google.com/iam/docs/service-accounts-create)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Ollama Documentation](https://ollama.com/)

## 🆘 Need Help?

1. Check workflow logs di GitHub Actions
2. Download artifacts untuk detailed debugging
3. Verify all secrets are set correctly
4. Test dengan manual workflow run
5. Check Google Cloud Console untuk API errors

---

**Setup Time**: ~15-20 menit
**Difficulty**: Medium
**Cost**: FREE
