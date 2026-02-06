# Grafana Metrics Collection Pipeline

## Overview

This pipeline automatically collects metrics from Grafana dashboards, converts them to readable Markdown reports, and uploads both JSON and Markdown files to MinIO storage.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Actions Workflow                       │
│                 (grafana-metrics-collector.yml)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: Collect Metrics from Grafana                           │
│  Script: .github/scripts/collect_grafana_metrics.py             │
│  Output: grafana-metrics/*.json                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: Generate ZITADEL Report                                │
│  Script: daily-reports/generate_zitadel_report.py               │
│  Output: grafana-metrics/zitadel_*.md                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: Convert All Metrics to Markdown                        │
│  Script: .github/scripts/convert_metrics_to_markdown.py         │
│  Output: grafana-metrics/kubernetes_*.md                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 4: Upload to MinIO                                        │
│  Script: .github/scripts/upload_metrics_to_minio.py             │
│  Destination: minio.pkc.pub/pkc/grafana-metrics/YYYY-MM-DD/     │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Metrics Collector (`collect_grafana_metrics.py`)

**Purpose:** Collect metrics from Grafana dashboards via API

**Features:**
- Authenticates with Grafana using username/password
- Queries Prometheus datasource through Grafana proxy
- Collects metrics from 15+ Kubernetes dashboards
- Special handling for ZITADEL authentication metrics
- Resolves Grafana template variables
- Saves metrics as JSON files with timestamps

**Dashboards Monitored:**
- Kubernetes API Server
- Kubernetes Compute Resources (Cluster, Namespace, Node, Pod)
- Kubernetes Networking (Cluster, Namespace, Pod)
- Kubernetes Kubelet, Scheduler, Persistent Volumes
- ZITADEL Authentication & User Monitoring

### 2. ZITADEL Report Generator (`generate_zitadel_report.py`)

**Purpose:** Convert ZITADEL metrics JSON to formatted Markdown report

**Features:**
- Extracts user registration metrics
- Tracks 7 authentication event types
- Generates trend visualizations
- Uses template-based report generation
- Calculates summary statistics

### 3. Generic Metrics Converter (`convert_metrics_to_markdown.py`)

**Purpose:** Convert all Kubernetes metrics JSON files to Markdown reports

**Features:**
- Processes all non-ZITADEL JSON files
- Formats numbers with K/M suffixes for readability
- Converts bytes to human-readable format
- Calculates min/max/avg statistics
- Generates structured Markdown reports
- Excludes summary and upload result files

**Output Format:**
```markdown
# Dashboard Name
**Collection Date:** YYYY-MM-DD
**Collection Time:** HH:MM:SS WITA
**Time Range:** 24h

## Metrics Summary
- Total Metrics Collected: X/Y
- Collection Status: ✅ Complete

## Metric Details
### 1. Metric Name
- Current Value: X.XX
- Min: X.XX
- Max: X.XX
- Avg: X.XX
```

### 4. MinIO Uploader (`upload_metrics_to_minio.py`)

**Purpose:** Upload JSON and Markdown files to MinIO object storage

**Features:**
- Uploads both .json and .md files
- Organizes files by date (YYYY-MM-DD)
- Sets appropriate content types
- Generates upload results summary
- Uses WITA timezone (UTC+8)

**Storage Structure:**
```
pkc/
└── grafana-metrics/
    └── 2026-02-06/
        ├── kubernetes___api_server_20260206_061711.json
        ├── kubernetes___api_server_20260206_061711.md
        ├── kubernetes___compute_resources___cluster_20260206_061800.json
        ├── kubernetes___compute_resources___cluster_20260206_061800.md
        ├── zitadel_authentication_&_user_monitoring_20260206_062204.json
        ├── zitadel_authentication_&_user_monitoring_20260206_062204.md
        └── latest_summary.json
```

## GitHub Actions Workflow

### Trigger Schedule
- **Cron:** `0 22 * * *` (Daily at 22:00 UTC = 06:00 AM WITA)
- **Manual:** Can be triggered via workflow_dispatch with custom time range

### Environment Variables
```yaml
GRAFANA_URL: https://grafana.pkc.pub
GRAFANA_USERNAME: ${{ secrets.GRAFANA_USERNAME }}
GRAFANA_PASSWORD: ${{ secrets.GRAFANA_PASSWORD }}
MINIO_ENDPOINT: minio.pkc.pub
MINIO_ACCESS_KEY: ${{ secrets.MINIO_ACCESS_KEY }}
MINIO_SECRET_KEY: ${{ secrets.MINIO_SECRET_KEY }}
TIME_RANGE: 24h (default, configurable)
```

### Workflow Steps

1. **Checkout repository**
2. **Set up Python 3.11**
3. **Install dependencies:** `requests`, `pandas`, `minio`, `python-dateutil`, `pytz`
4. **Create metrics directory**
5. **Collect metrics from Grafana** → JSON files
6. **Generate ZITADEL report** → ZITADEL Markdown
7. **Convert all metrics to Markdown** → Kubernetes Markdown files
8. **Upload to MinIO** → Both JSON and MD files
9. **Upload artifacts** → GitHub Actions artifacts (30-day retention)

## Usage

### Manual Trigger

```bash
# Trigger via GitHub CLI
gh workflow run grafana-metrics-collector.yml

# With custom time range
gh workflow run grafana-metrics-collector.yml -f time_range=6h
```

### Local Testing

```bash
# Set environment variables
export GRAFANA_URL="https://grafana.pkc.pub"
export GRAFANA_USERNAME="your-username"
export GRAFANA_PASSWORD="your-password"
export TIME_RANGE="24h"

# Collect metrics
python3 .github/scripts/collect_grafana_metrics.py

# Generate ZITADEL report
python3 daily-reports/generate_zitadel_report.py \
  grafana-metrics/zitadel_*.json \
  grafana-metrics/zitadel_report.md

# Convert all metrics to Markdown
python3 .github/scripts/convert_metrics_to_markdown.py grafana-metrics

# Upload to MinIO
export MINIO_ENDPOINT="minio.pkc.pub"
export MINIO_ACCESS_KEY="your-access-key"
export MINIO_SECRET_KEY="your-secret-key"
python3 .github/scripts/upload_metrics_to_minio.py
```

## Accessing Reports

### Via MinIO Console
1. Navigate to: https://minio.pkc.pub/browser/pkc/grafana-metrics/
2. Select date folder (e.g., `2026-02-06/`)
3. Download `.md` files for human-readable reports
4. Download `.json` files for raw data

### Via Direct URL
```
https://minio.pkc.pub/pkc/grafana-metrics/YYYY-MM-DD/filename.md
```

## Report Examples

### Kubernetes Dashboard Report
- Metric counts and availability
- Current values with min/max/avg statistics
- Formatted numbers (K/M suffixes)
- Byte conversion (KB/MB/GB)
- Timestamp information

### ZITADEL Report
- Total registered users with trend
- 7 authentication event types
- Most common authentication method
- Data point coverage
- Time range information

## Troubleshooting

### No metrics collected
- Check Grafana credentials in GitHub Secrets
- Verify Grafana URL is accessible
- Check Prometheus datasource availability

### Markdown conversion fails
- Ensure JSON files are valid
- Check Python dependencies installed
- Verify file permissions

### MinIO upload fails
- Verify MinIO credentials in GitHub Secrets
- Check MinIO endpoint accessibility
- Ensure bucket `pkc` exists

## Maintenance

### Adding New Dashboards
Edit `collect_grafana_metrics.py`:
```python
dashboard_list = [
    ("dashboard-uid", "Dashboard Name"),
    # Add new dashboard here
]
```

### Customizing Report Format
- For ZITADEL: Edit `daily-reports/zitadel_report_template.md`
- For Kubernetes: Modify `convert_metrics_to_markdown.py` → `generate_kubernetes_report()`

### Changing Upload Schedule
Edit `.github/workflows/grafana-metrics-collector.yml`:
```yaml
schedule:
  - cron: '0 22 * * *'  # Modify this line
```

## File Retention

- **GitHub Artifacts:** 30 days
- **MinIO Storage:** Indefinite (manual cleanup required)

## Security Notes

- All credentials stored in GitHub Secrets
- MinIO uses HTTPS/TLS encryption
- Grafana session-based authentication
- No credentials in code or logs

---

*Last Updated: 2026-02-06*
