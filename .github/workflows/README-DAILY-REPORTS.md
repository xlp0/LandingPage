# Daily Commit Summary Reports by User

Workflow otomatis yang mengumpulkan commit harian, memisahkan berdasarkan user (Henry & Alessandro), memproses dengan AI (Ollama llama3.2), mengkonversi ke PDF, upload ke MinIO, dan membuat event terpisah di Google Calendar untuk setiap user.

## 🎯 Fitur

- ✅ Berjalan otomatis setiap hari jam **06:00 WITA** (Waktu Indonesia Tengah)
- ✅ Mengumpulkan semua commit dari **hari kemarin**
- ✅ **Memisahkan commit berdasarkan user**: Henry (githubhenrykoo) dan Alessandro (alessandrorumampuk)
- ✅ Memproses commit dengan **Ollama llama3.2** untuk setiap user secara terpisah
- ✅ Menghasilkan laporan dengan **4 bagian**: Summary, Suggestions, Critique, Conclusion
- ✅ Konversi otomatis: **Markdown → LaTeX → PDF**
- ✅ Upload ke **MinIO** dengan struktur folder per user dan tanggal
- ✅ Membuat **2 event terpisah** di Google Calendar (satu untuk Henry, satu untuk Alessandro)
- ✅ Dapat dijalankan manual untuk testing

## ⏰ Jadwal

- **Cron Schedule**: `0 22 * * *` (UTC)
- **WITA Time**: 06:00 pagi setiap hari
- **Timezone**: Asia/Makassar (UTC+8)

## 📊 Workflow Steps

### 1. **Collect Commits**
Mengumpulkan semua commit dari hari kemarin (00:00 - 23:59 WITA).

### 2. **Separate by User**
Memisahkan commit berdasarkan username/email:
- **Henry**: githubhenrykoo
- **Alessandro**: alessandrorumampuk

### 3. **Process with AI (Per User)**
Untuk setiap user, Ollama llama3.2 menganalisis commit dan menghasilkan:
- **Summary**: 5-10 poin ringkasan pencapaian
- **Suggestions**: 5-10 saran konstruktif untuk improvement
- **Critique**: 5-10 kritik jujur tentang area yang perlu diperbaiki
- **Conclusion**: 2-3 paragraf kesimpulan keseluruhan

### 4. **Generate Reports**
Membuat laporan Markdown untuk setiap user dengan format:
```
# Daily Report - YYYY-MM-DD
**Author:** Henry/Alessandro
**Date:** YYYY-MM-DD

## Summary
- Point 1
- Point 2
...

## Suggestions
- Point 1
- Point 2
...

## Critique
- Point 1
- Point 2
...

## Conclusion
Paragraf kesimpulan...
```

### 5. **Convert to PDF**
Konversi otomatis: Markdown → LaTeX → PDF menggunakan pdflatex.

### 6. **Upload to MinIO**
Upload semua file (MD, LaTeX, PDF) ke MinIO dengan struktur:
```
daily-reports/
  └── YYYY-MM-DD/
      ├── Henry/
      │   ├── henry_YYYY-MM-DD.md
      │   ├── henry_YYYY-MM-DD.tex
      │   └── henry_YYYY-MM-DD.pdf
      └── Alessandro/
          ├── alessandro_YYYY-MM-DD.md
          ├── alessandro_YYYY-MM-DD.tex
          └── alessandro_YYYY-MM-DD.pdf
```

**Public URLs**:
- Henry: `https://minio.pkc.pub/browser/daily-reports/YYYY-MM-DD/Henry/`
- Alessandro: `https://minio.pkc.pub/browser/daily-reports/YYYY-MM-DD/Alessandro/`

### 7. **Create Calendar Events**
Membuat 2 event terpisah di Google Calendar:

**Event untuk Henry**:
```
Title: 📊 Daily Report from Henry - YYYY-MM-DD
Description:
  👤 User: Henry
  📅 Date: YYYY-MM-DD
  📝 Commits: X
  
  📋 Summary:
  • Point 1
  • Point 2
  • Point 3
  
  🔗 Full Report: [PDF URL]
```

**Event untuk Alessandro**:
```
Title: 📊 Daily Report from Alessandro - YYYY-MM-DD
Description:
  👤 User: Alessandro
  📅 Date: YYYY-MM-DD
  📝 Commits: X
  
  📋 Summary:
  • Point 1
  • Point 2
  • Point 3
  
  🔗 Full Report: [PDF URL]
```

## 🔧 Setup

### 1. Google Service Account Setup

Sama seperti sebelumnya, buat Service Account dan share calendar dengan email service account.

**Calendar ID (Hardcoded)**:
```
f0a800fb2e065c7a82fe3d4ffc26a1620a39737e8bcdbbd9e1ab1d6728090894@group.calendar.google.com
```

### 2. MinIO Setup

Anda perlu MinIO credentials untuk upload file.

### 3. GitHub Secrets Setup

Tambahkan secrets berikut di repository:

#### Secret 1: `GOOGLE_API_KEY`
```
AIzaSyBFnvQpbGWsaqlRddIeM0ZAhzwmbhE4oFk
```
Google Gemini API key untuk AI analysis. Get your key at: https://aistudio.google.com/apikey

#### Secret 2: `GOOGLE_SERVICE_ACCOUNT_KEY`
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "xxxxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "service-account@project.iam.gserviceaccount.com",
  ...
}
```

#### Secret 3: `MINIO_ACCESS_KEY`
```
your-minio-access-key
```

#### Secret 4: `MINIO_SECRET_KEY`
```
your-minio-secret-key
```

## 📁 File Structure

```
.github/
  ├── workflows/
  │   ├── daily-commit-summary.yml          # Main workflow
  │   └── README-DAILY-REPORTS.md           # This file
  └── scripts/
      ├── process_commits.py                # Separate commits by user & call LLM
      ├── convert_to_pdf.py                 # Convert MD → LaTeX → PDF
      ├── upload_to_minio.py                # Upload files to MinIO
      └── create_calendar_events.py         # Create Google Calendar events

daily-reports/                              # Generated reports (gitignored)
  ├── henry_YYYY-MM-DD.md
  ├── henry_YYYY-MM-DD.tex
  ├── henry_YYYY-MM-DD.pdf
  ├── alessandro_YYYY-MM-DD.md
  ├── alessandro_YYYY-MM-DD.tex
  ├── alessandro_YYYY-MM-DD.pdf
  ├── processing_results.json
  ├── upload_results.json
  └── calendar_events.json
```

## 🤖 AI Analysis Format

**Using Google Gemini API with Structured Output**

The workflow now uses **Google Gemini 2.0 Flash** with structured JSON output via Pydantic schemas. This guarantees valid, parsable JSON responses every time.

**Pydantic Schema:**
```python
class CommitAnalysis(BaseModel):
    summary: List[str]        # 5-10 bullet points
    suggestions: List[str]    # 5-10 constructive suggestions
    critique: List[str]       # 5-10 honest critiques
    conclusion: str           # 2-3 paragraphs
```

**Example Output:**
```json
{
  "summary": [
    "Implemented feature X with Y functionality",
    "Fixed bug in Z component",
    "Refactored A module for better performance",
    ...
  ],
  "suggestions": [
    "Consider adding unit tests for new features",
    "Code could benefit from better documentation",
    "Explore using design pattern X for Y",
    ...
  ],
  "critique": [
    "Some functions are too long and should be split",
    "Error handling could be more robust",
    "Code duplication detected in modules A and B",
    ...
  ],
  "conclusion": "Overall assessment paragraph discussing achievements, quality, and recommendations..."
}
```

**Benefits:**
- ✅ **Guaranteed valid JSON** - No more parsing errors
- ✅ **Type-safe responses** - Pydantic validates structure
- ✅ **Faster processing** - No need for Ollama installation
- ✅ **Better quality** - Gemini 2.0 produces more accurate analysis

## 🔍 Troubleshooting

### No commits for a user
- **Normal**: User tidak melakukan commit kemarin
- **Result**: Tidak ada laporan dibuat untuk user tersebut, tidak ada event di calendar

### AI timeout or invalid response
- **Fixed**: Now using Google Gemini API with structured output - guaranteed valid JSON
- **No more parsing errors**: Pydantic validates the response structure automatically

### PDF conversion fails
- **Cause**: LaTeX syntax error atau package tidak tersedia
- **Check**: Workflow logs untuk detail error dari pdflatex

### MinIO upload fails
- **Cause**: Credentials salah atau bucket tidak accessible
- **Check**: Verify MINIO_ACCESS_KEY dan MINIO_SECRET_KEY secrets

### Calendar event creation fails
- **Cause**: Calendar tidak di-share dengan service account
- **Solution**: Share calendar dengan service account email dan berikan permission "Make changes to events"

## 📝 Manual Testing

### Test locally (requires Ollama installed):

```bash
# 1. Get commits
git log --since="2025-12-15 00:00:00" --until="2025-12-15 23:59:59" \
  --pretty=format:"%H|%an|%ae|%ad|%s|%b" --date=iso > commits.txt

# 2. Process commits
python3 .github/scripts/process_commits.py commits.txt

# 3. Convert to PDF (requires pdflatex)
python3 .github/scripts/convert_to_pdf.py daily-reports/henry_2025-12-15.md

# 4. Upload to MinIO (requires credentials)
export MINIO_ACCESS_KEY="your-key"
export MINIO_SECRET_KEY="your-secret"
python3 .github/scripts/upload_to_minio.py daily-reports/processing_results.json

# 5. Create calendar events (requires Google credentials)
export GOOGLE_CREDENTIALS='{"type":"service_account",...}'
python3 .github/scripts/create_calendar_events.py daily-reports/upload_results.json daily-reports/processing_results.json
```

## 🎨 Customization

### Add more users
Edit `.github/scripts/process_commits.py`:
```python
USERS = {
    'Henry': 'githubhenrykoo',
    'Alessandro': 'alessandrorumampuk',
    'NewUser': 'github-username'  # Add here
}
```

### Change report format
Edit `.github/scripts/process_commits.py` function `generate_llm_prompt()` untuk mengubah prompt yang dikirim ke AI.

### Change PDF styling
Edit `.github/scripts/convert_to_pdf.py` untuk mengubah LaTeX template.

## 📚 Dependencies

### Python packages:
- `google-auth`
- `google-auth-oauthlib`
- `google-auth-httplib2`
- `google-api-python-client`
- `minio`

### System packages:
- `texlive-latex-base`
- `texlive-fonts-recommended`
- `texlive-fonts-extra`
- `texlive-latex-extra`
- `ollama`

## 🆘 Support

Jika ada masalah:
1. Cek workflow logs di GitHub Actions tab
2. Download artifacts untuk melihat detail laporan dan error
3. Verifikasi semua secrets sudah di-set dengan benar
4. Pastikan service account punya akses ke calendar
5. Pastikan MinIO credentials valid

---

**Created by**: GitHub Actions Automation  
**Last Updated**: December 2025  
**Version**: 2.0 (User-separated reports with MinIO integration)
