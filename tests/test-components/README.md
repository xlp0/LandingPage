# CLM Test Components Results

Folder ini menyimpan hasil testing untuk setiap komponen CLM dalam format JSON.

## Format File

Setiap file bernama `{hash}.json` sesuai dengan `hash` di `clm-registry.yaml`.

### Struktur JSON

```json
{
  "hash": "welcome",
  "timestamp": "2024-12-03T10:30:00Z",
  "test_run": 123,
  "status": "success",
  "github_actions_url": "https://github.com/user/repo/actions/runs/123456",
  "commit_sha": "abc123def456",
  "branch": "main",
  "actor": "github-actions[bot]"
}
```

## File List

- `welcome.json` - Hasil test untuk Welcome Component

## Automated Updates

File-file ini di-update otomatis oleh GitHub Actions workflow setiap kali:
- Code di-push ke branch `main` atau `develop`
- Pull request dibuat
- Workflow di-trigger manual

## Usage

File JSON ini dibaca oleh dashboard (`index.html`) untuk menampilkan status test di badge header.

### Access via Browser
```
http://localhost:8765/tests/test-components/welcome.json
```

### Access via JavaScript
```javascript
const response = await fetch('/tests/test-components/welcome.json');
const testData = await response.json();
console.log(testData);
```

## Notes

- File akan selalu ter-overwrite dengan hasil test terbaru
- Untuk menyimpan history, implementasikan `welcome-history.json` (lihat dokumentasi)
- File ini harus accessible oleh web server untuk dashboard badge berfungsi
