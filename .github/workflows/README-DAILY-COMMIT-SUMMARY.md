# Daily Commit Summary to Google Calendar

Workflow otomatis yang mengumpulkan commit harian, memproses dengan AI (Ollama llama3.2), dan menambahkan ringkasan ke Google Calendar.

## 🎯 Fitur

- ✅ Berjalan otomatis setiap hari jam **06:00 WITA** (Waktu Indonesia Tengah - Bali)
- ✅ Mengumpulkan semua commit dari **hari kemarin**
- ✅ Memproses commit dengan **Ollama llama3.2** (AI lokal)
- ✅ Membuat event di **Google Calendar** dengan ringkasan AI
- ✅ Dapat dijalankan manual untuk testing

## ⏰ Jadwal

- **Cron Schedule**: `0 22 * * *` (UTC)
- **WITA Time**: 06:00 pagi setiap hari
- **Timezone**: Asia/Makassar (UTC+8)

Ketika workflow berjalan jam 06:00 WITA, ia akan memproses semua commit dari **hari kemarin** (bukan hari ini).

## 🔧 Setup

### 1. Google Service Account Setup

Anda perlu membuat **Service Account** di Google Cloud Console karena GitHub Actions tidak bisa menggunakan OAuth interaktif.

#### Langkah-langkah:

1. **Buka Google Cloud Console**: https://console.cloud.google.com/

2. **Buat atau pilih project**

3. **Enable Google Calendar API**:
   - Navigation Menu → APIs & Services → Library
   - Cari "Google Calendar API"
   - Klik "Enable"

4. **Buat Service Account**:
   - Navigation Menu → IAM & Admin → Service Accounts
   - Klik "Create Service Account"
   - Nama: `github-actions-calendar`
   - Deskripsi: `Service account for GitHub Actions to create calendar events`
   - Klik "Create and Continue"
   - Skip role assignment (klik "Continue")
   - Klik "Done"

5. **Buat Service Account Key**:
   - Klik service account yang baru dibuat
   - Tab "Keys" → "Add Key" → "Create new key"
   - Pilih format: **JSON**
   - Download file JSON (simpan dengan aman!)

6. **Share Calendar dengan Service Account**:
   - Buka Google Calendar: https://calendar.google.com/
   - Pilih calendar yang ingin digunakan
   - Klik ⚙️ (Settings) → "Settings for my calendars"
   - Pilih calendar → "Share with specific people"
   - Klik "Add people"
   - Masukkan **email service account** (format: `github-actions-calendar@PROJECT-ID.iam.gserviceaccount.com`)
   - Permission: **Make changes to events**
   - Klik "Send"

7. **Dapatkan Calendar ID**:
   - Di settings calendar yang sama
   - Scroll ke "Integrate calendar"
   - Copy **Calendar ID** (format: `xxxxx@group.calendar.google.com` atau `primary`)

### 2. GitHub Secrets Setup

Tambahkan secrets di repository GitHub Anda:

**Settings → Secrets and variables → Actions → New repository secret**

#### Secret 1: `GOOGLE_SERVICE_ACCOUNT_KEY`
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "xxxxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\nxxxxx\n-----END PRIVATE KEY-----\n",
  "client_email": "github-actions-calendar@your-project.iam.gserviceaccount.com",
  "client_id": "xxxxx",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/xxxxx"
}
```
**Paste seluruh isi file JSON yang di-download dari step 5 di atas.**

#### Secret 2: `GOOGLE_CALENDAR_ID`
```
your-calendar-id@group.calendar.google.com
```
**Atau gunakan `primary` untuk calendar utama.**

### 3. Verifikasi Setup

Setelah setup selesai, Anda bisa:

1. **Test manual**:
   - Go to Actions tab di GitHub
   - Pilih workflow "Daily Commit Summary to Google Calendar"
   - Klik "Run workflow"
   - Pilih branch
   - Klik "Run workflow"

2. **Tunggu workflow selesai** (sekitar 2-3 menit)

3. **Cek Google Calendar** - seharusnya ada event baru dengan:
   - 📝 Judul: Ringkasan commit dari AI
   - 📅 Tanggal: Kemarin
   - 📝 Deskripsi: Detail commit yang diproses AI

## 🤖 Cara Kerja AI

Workflow menggunakan **Ollama** dengan model **llama3.2** yang berjalan di GitHub Actions runner:

1. **Setup Ollama**: Install Ollama CLI di runner
2. **Pull Model**: Download model llama3.2 (~2GB)
3. **Cache Model**: Model di-cache untuk workflow berikutnya (lebih cepat)
4. **Process Commits**: AI menganalisis commit dan membuat ringkasan
5. **Generate Summary**: AI membuat title dan description yang profesional

### Format Output AI:

```json
{
  "title": "Brief summary title (max 100 chars)",
  "description": "Detailed description highlighting main features, bug fixes, and technical decisions (max 500 chars)"
}
```

## 📊 Workflow Steps

1. ✅ **Checkout repository** - Clone repo dengan full history
2. ✅ **Setup Python** - Install Python 3.11
3. ✅ **Install dependencies** - Google Calendar API libraries
4. ✅ **Setup Ollama** - Install Ollama CLI
5. ✅ **Pull llama3.2** - Download AI model
6. ✅ **Get yesterday's commits** - Collect commits from previous day
7. ✅ **Process with AI** - Analyze commits with llama3.2
8. ✅ **Create Calendar Event** - Add event to Google Calendar
9. ✅ **Upload artifacts** - Save logs for debugging

## 🔍 Troubleshooting

### Workflow gagal dengan "No commits found"
- **Normal**: Tidak ada commit kemarin
- **Solusi**: Tidak perlu action, workflow akan skip

### Error: "GOOGLE_CREDENTIALS secret not set"
- **Penyebab**: Secret `GOOGLE_SERVICE_ACCOUNT_KEY` belum di-set
- **Solusi**: Ikuti setup step 2 di atas

### Error: "Calendar not found" atau "Permission denied"
- **Penyebab**: Service account belum di-share ke calendar
- **Solusi**: Share calendar dengan service account email (setup step 6)

### AI response tidak valid JSON
- **Penyebab**: Model AI kadang memberikan response yang tidak terstruktur
- **Solusi**: Workflow punya fallback - akan tetap membuat event dengan format default

### Workflow timeout
- **Penyebab**: Download model llama3.2 terlalu lama
- **Solusi**: Model akan di-cache setelah download pertama kali

## 📝 Manual Testing

Untuk test workflow secara manual:

```bash
# 1. Test get commits
git log --since="2025-12-14 00:00:00" --until="2025-12-14 23:59:59" \
  --pretty=format:"%H|%an|%ae|%ad|%s|%b" --date=iso

# 2. Test Ollama locally (jika ada Ollama di local)
ollama run llama3.2 "Summarize these commits: [paste commits here]"
```

## 🎨 Customization

### Ubah waktu running:
Edit file `.github/workflows/daily-commit-summary.yml`:
```yaml
schedule:
  - cron: '0 22 * * *'  # Ubah sesuai kebutuhan (UTC time)
```

### Ubah timezone:
```bash
TZ='Asia/Makassar'  # Ubah ke timezone lain jika perlu
```

### Ubah AI model:
```yaml
- name: Pull Ollama model
  run: |
    ollama pull llama3.2  # Ganti dengan model lain (llama3, mistral, dll)
```

### Ubah format event:
Edit section "Create Google Calendar Event" di workflow file.

## 📚 Resources

- [Google Calendar API Documentation](https://developers.google.com/calendar/api/v3/reference)
- [Ollama Documentation](https://ollama.com/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Service Account Setup Guide](https://cloud.google.com/iam/docs/service-accounts-create)

## 🆘 Support

Jika ada masalah:
1. Cek workflow logs di GitHub Actions tab
2. Download artifacts untuk melihat detail commit dan AI response
3. Verifikasi semua secrets sudah di-set dengan benar
4. Pastikan service account punya akses ke calendar

---

**Created by**: GitHub Actions Automation
**Last Updated**: December 2025
