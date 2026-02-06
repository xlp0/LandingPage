# Grafana Metrics Collection Scripts

This directory contains scripts for collecting, converting, and uploading Grafana metrics.

## Scripts Overview

### 1. `collect_grafana_metrics.py`

**Purpose:** Collect metrics from Grafana dashboards via API

**Usage:**
```bash
export GRAFANA_URL="https://grafana.pkc.pub"
export GRAFANA_USERNAME="admin"
export GRAFANA_PASSWORD="your-password"
export TIME_RANGE="24h"
export OUTPUT_DIR="grafana-metrics"

python3 collect_grafana_metrics.py
```

**Output:**
- JSON files in `grafana-metrics/` directory
- One file per dashboard with timestamp
- Summary file: `latest_summary.json`

**Features:**
- Authenticates with Grafana
- Queries 15+ Kubernetes dashboards
- Special ZITADEL metrics collection
- Template variable resolution
- Prometheus datasource auto-detection

---

### 2. `convert_metrics_to_markdown.py`

**Purpose:** Convert JSON metrics to readable Markdown reports

**Usage:**
```bash
# Convert all JSON files in default directory
python3 convert_metrics_to_markdown.py

# Convert from custom directory
python3 convert_metrics_to_markdown.py /path/to/metrics
```

**Output:**
- Markdown files alongside JSON files
- Same filename with `.md` extension
- Formatted metrics with statistics

**Features:**
- Automatic value formatting (K/M suffixes)
- Byte conversion (KB/MB/GB)
- Min/Max/Avg calculations
- Excludes ZITADEL (has dedicated generator)
- Skips summary files

---

### 3. `upload_metrics_to_minio.py`

**Purpose:** Upload JSON and Markdown files to MinIO storage

**Usage:**
```bash
export MINIO_ENDPOINT="minio.pkc.pub"
export MINIO_ACCESS_KEY="your-access-key"
export MINIO_SECRET_KEY="your-secret-key"

python3 upload_metrics_to_minio.py
```

**Output:**
- Files uploaded to `pkc/grafana-metrics/YYYY-MM-DD/`
- Upload results: `upload_results.json`

**Features:**
- Uploads both JSON and MD files
- Date-based organization
- Content-type detection
- WITA timezone (UTC+8)
- Upload status tracking

---

## Dependencies

```bash
pip install requests pandas minio python-dateutil pytz
```

## Environment Variables

### Grafana Collection
- `GRAFANA_URL` - Grafana instance URL (default: https://grafana.pkc.pub)
- `GRAFANA_USERNAME` - Grafana username (default: admin)
- `GRAFANA_PASSWORD` - Grafana password (required)
- `TIME_RANGE` - Metrics time range (default: 24h)
- `OUTPUT_DIR` - Output directory (default: grafana-metrics)

### MinIO Upload
- `MINIO_ENDPOINT` - MinIO server endpoint (default: minio.pkc.pub)
- `MINIO_ACCESS_KEY` - MinIO access key (required)
- `MINIO_SECRET_KEY` - MinIO secret key (required)

## Workflow Integration

These scripts are used in `.github/workflows/grafana-metrics-collector.yml`:

1. **Collect** → `collect_grafana_metrics.py`
2. **Convert** → `convert_metrics_to_markdown.py`
3. **Upload** → `upload_metrics_to_minio.py`

## File Structure

```
grafana-metrics/
├── kubernetes___api_server_20260206_061711.json
├── kubernetes___api_server_20260206_061711.md
├── kubernetes___compute_resources___cluster_20260206_061800.json
├── kubernetes___compute_resources___cluster_20260206_061800.md
├── zitadel_authentication_&_user_monitoring_20260206_062204.json
├── zitadel_authentication_&_user_monitoring_20260206_062204.md
├── latest_summary.json
└── upload_results.json
```

## Error Handling

All scripts include:
- ✅ Success indicators
- ❌ Error messages
- ⚠️ Warning notifications
- Detailed logging
- Exit codes for CI/CD

## Testing Locally

```bash
# 1. Collect metrics
python3 .github/scripts/collect_grafana_metrics.py

# 2. Convert to Markdown
python3 .github/scripts/convert_metrics_to_markdown.py grafana-metrics

# 3. Upload to MinIO
python3 .github/scripts/upload_metrics_to_minio.py

# 4. Verify
ls -lh grafana-metrics/
```

## Troubleshooting

### Script Permission Denied
```bash
chmod +x .github/scripts/*.py
```

### Module Not Found
```bash
pip install -r requirements.txt
```

### Connection Errors
- Check network connectivity
- Verify credentials
- Confirm endpoint URLs

---

For detailed documentation, see:
- [Grafana Metrics Pipeline](../../docs/09-performance/observability/GRAFANA-METRICS-PIPELINE.md)
- [Metrics Conversion Guide](../../docs/09-performance/observability/METRICS-CONVERSION-GUIDE.md)
