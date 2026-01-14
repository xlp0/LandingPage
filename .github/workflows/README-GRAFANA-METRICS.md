# Grafana Metrics Collector Workflow

## 📋 Overview

Workflow GitHub Actions ini secara otomatis mengumpulkan metrics dari Grafana dashboard (khususnya ZITADEL Authentication and User Monitoring) dan menyimpannya ke MinIO storage.

## 🎯 Features

- ✅ Otomatis collect metrics dari Grafana setiap jam
- ✅ Support manual trigger untuk testing
- ✅ Query metrics melalui Grafana API ke Prometheus
- ✅ Export data dalam format JSON
- ✅ Upload otomatis ke MinIO storage
- ✅ Organize files berdasarkan tanggal (YYYY/MM/DD)
- ✅ Artifact retention untuk backup

## 🔧 Setup Instructions

### 1. Configure GitHub Secrets

Tambahkan secrets berikut di repository settings (`Settings` → `Secrets and variables` → `Actions`):

#### Required Secrets:

```
GRAFANA_USERNAME=admin
GRAFANA_PASSWORD=r8RKaVP3rzJe6MsuloQv9B4G2UPzSe387DMpOY0r
MINIO_ACCESS_KEY=<your-minio-access-key>
MINIO_SECRET_KEY=<your-minio-secret-key>
```

**⚠️ PENTING:** Jangan commit secrets ini ke repository!

### 2. Verify Workflow File

File workflow: `.github/workflows/grafana-metrics-collector.yml`

### 3. Test Manual Run

1. Buka repository di GitHub
2. Pergi ke tab `Actions`
3. Pilih workflow "Grafana Metrics Collector"
4. Klik `Run workflow`
5. (Optional) Ubah time range (default: 1h)
6. Klik tombol hijau `Run workflow`

## 📊 Metrics Collected

Workflow ini mengumpulkan metrics ZITADEL berikut:

### Authentication Metrics:
- **active_sessions** - Total active user sessions
- **failed_logins** - Rate of failed authentication attempts
- **successful_logins** - Rate of successful authentications
- **auth_requests** - Rate of authentication requests
- **token_requests** - Rate of token issuance requests

### User Metrics:
- **active_users** - Total active users
- **registered_users** - Total registered users

### System Metrics:
- **api_calls** - Rate of API calls
- **database_connections** - Number of database connections
- **cache_hit_rate** - Cache performance ratio

## 📁 Output Structure

### Local Artifacts (GitHub Actions):
```
grafana-metrics/
├── zitadel_metrics_20260114_010000.json
├── latest_summary.json
└── upload_results.json
```

### MinIO Storage:
```
grafana-metrics/
├── 2026/
│   └── 01/
│       └── 14/
│           ├── zitadel_metrics_20260114_010000.json
│           └── latest_summary.json
```

## 📝 Output Format

### Metrics File (`zitadel_metrics_*.json`):
```json
{
  "timestamp": "2026-01-14T01:00:00+00:00",
  "time_range": "1h",
  "source": "ZITADEL",
  "dashboard": "zitadel-auth",
  "metrics": {
    "active_sessions": {
      "status": "success",
      "data": {
        "resultType": "matrix",
        "result": [...]
      }
    },
    ...
  }
}
```

### Summary File (`latest_summary.json`):
```json
{
  "collection_time": "2026-01-14T01:00:00+00:00",
  "time_range": "1h",
  "source": "ZITADEL",
  "metrics_collected": 10,
  "total_metrics": 10,
  "filename": "grafana-metrics/zitadel_metrics_20260114_010000.json"
}
```

## ⏰ Schedule

Workflow berjalan otomatis:
- **Frequency:** Setiap jam pada menit ke-0 (00:00, 01:00, 02:00, dst.)
- **Cron:** `0 * * * *`
- **Timezone:** UTC

## 🔍 Troubleshooting

### Issue: Login gagal ke Grafana
**Solution:** 
- Verify `GRAFANA_USERNAME` dan `GRAFANA_PASSWORD` di GitHub Secrets
- Test credentials manual dengan: `curl -u admin:PASSWORD https://grafana.pkc.pub/api/health`

### Issue: Metrics kosong
**Solution:**
- Check apakah Prometheus datasource ID benar (default: 1)
- Verify metric names di Grafana query editor
- Test query manual di Grafana Explore

### Issue: Upload ke MinIO gagal
**Solution:**
- Verify `MINIO_ACCESS_KEY` dan `MINIO_SECRET_KEY`
- Check MinIO bucket permissions
- MinIO di belakang reverse proxy, gunakan standard HTTPS URL: `https://minio.pkc.pub`
- Workflow menggunakan boto3 S3 client (kompatibel dengan MinIO)
- Test connection dengan AWS CLI: `aws s3 ls --endpoint-url https://minio.pkc.pub`

### Issue: No data for specific metrics
**Solution:**
- Metrics mungkin tidak tersedia di ZITADEL installation
- Check Prometheus targets: `https://grafana.pkc.pub/api/datasources/proxy/1/api/v1/targets`
- Adjust metric queries di script sesuai available metrics

## 🔄 Workflow Steps

1. **Checkout repository** - Clone repo
2. **Set up Python** - Install Python 3.11
3. **Install dependencies** - Install required packages
4. **Create metrics directory** - Prepare output folder
5. **Collect metrics** - Query Grafana API untuk metrics
6. **Upload to MinIO** - Store metrics di object storage
7. **Upload artifacts** - Backup ke GitHub Artifacts (30 days)

## 📊 Monitoring

### View Workflow Runs:
1. Buka repository di GitHub
2. Tab `Actions`
3. Pilih workflow "Grafana Metrics Collector"
4. Click pada run untuk melihat logs detail

### Download Artifacts:
1. Buka workflow run
2. Scroll ke bagian "Artifacts"
3. Download `grafana-metrics-<run-id>`

## 🛠️ Customization

### Change Collection Frequency:

Edit cron schedule di `.github/workflows/grafana-metrics-collector.yml`:

```yaml
schedule:
  # Every 6 hours
  - cron: '0 */6 * * *'
  
  # Every day at 2 AM
  - cron: '0 2 * * *'
```

### Add More Metrics:

Edit `queries` dictionary di `.github/scripts/collect_grafana_metrics.py`:

```python
queries = {
    "custom_metric": 'your_prometheus_query_here',
    ...
}
```

### Change Time Range:

Default: 1 hour. Options: `1h`, `6h`, `12h`, `24h`, `7d`

Manual run: Specify di workflow dispatch
Automated: Edit `TIME_RANGE` env var di workflow file

## 📚 References

- **Grafana Dashboard:** https://grafana.pkc.pub/d/zitadel-auth/zitadel-authentication-and-user-monitoring
- **Grafana API Docs:** https://grafana.com/docs/grafana/latest/developers/http_api/
- **Prometheus Query API:** https://prometheus.io/docs/prometheus/latest/querying/api/
- **MinIO Python SDK:** https://min.io/docs/minio/linux/developers/python/API.html

## 🔐 Security Notes

- ✅ All credentials stored in GitHub Secrets (encrypted)
- ✅ Secrets tidak exposed di logs
- ✅ HTTPS untuk semua API calls
- ✅ MinIO connection menggunakan TLS
- ⚠️ Rotate credentials secara berkala
- ⚠️ Audit access logs di MinIO

## 💡 Tips

1. **Testing:** Gunakan manual workflow dispatch dengan time range pendek (1h) untuk testing
2. **Storage:** Monitor MinIO bucket size, implement retention policy jika perlu
3. **Alerts:** Setup notifications jika workflow fails
4. **Analysis:** Download metrics files untuk analysis dengan Pandas/Excel
5. **Visualization:** Import JSON ke visualization tools (Grafana, Tableau, etc.)

## 📞 Support

Jika ada issues atau questions, check:
1. Workflow logs di GitHub Actions
2. Script output di artifacts
3. MinIO bucket contents
4. Grafana API health: `https://grafana.pkc.pub/api/health`
