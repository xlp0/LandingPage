# Grafana Metrics to Markdown Conversion Guide

## Quick Start

### Automatic Conversion (GitHub Actions)

The pipeline automatically runs daily at 06:00 AM WITA and converts all metrics to Markdown:

1. **Collects** metrics from Grafana → JSON files
2. **Converts** JSON to Markdown → MD files  
3. **Uploads** both formats to MinIO

**Result:** Both `.json` and `.md` files available at:
```
https://minio.pkc.pub/browser/pkc/grafana-metrics/YYYY-MM-DD/
```

### Manual Conversion

Convert existing JSON files to Markdown locally:

```bash
# Convert all JSON files in grafana-metrics directory
python3 .github/scripts/convert_metrics_to_markdown.py grafana-metrics

# Convert from custom directory
python3 .github/scripts/convert_metrics_to_markdown.py /path/to/metrics
```

## What Gets Converted

### ✅ Converted to Markdown
- All Kubernetes dashboard metrics
- API Server metrics
- Compute Resources metrics
- Networking metrics
- Kubelet, Scheduler, Persistent Volumes metrics

### ⏭️ Skipped (Has Dedicated Generator)
- ZITADEL metrics (uses `generate_zitadel_report.py`)

### 🚫 Excluded
- `latest_summary.json`
- `upload_results.json`
- Any file with "summary" in the name

## Output Format

Each JSON file generates a corresponding Markdown file with:

### Header Section
```markdown
# Dashboard Name
**Collection Date:** 2026-02-06
**Collection Time:** 06:17:11 WITA
**Time Range:** 24h
**Dashboard UID:** abc123
```

### Metrics Summary
```markdown
## 📊 Metrics Summary
- Total Metrics Collected: 45/50
- Collection Status: ✅ Complete
```

### Detailed Metrics
```markdown
## 📈 Metric Details

### 1. CPU Usage
- Current Value: 2.45K
- Min: 1.23K
- Max: 3.67K
- Avg: 2.34K

### 2. Memory Usage
- Current Value: 4.56 GB
- Min: 3.21 GB
- Max: 5.89 GB
- Avg: 4.45 GB
```

## Value Formatting

The converter automatically formats values for readability:

| Original Value | Formatted | Rule |
|---------------|-----------|------|
| 1234567 | 1.23M | Numbers ≥ 1M |
| 12345 | 12.35K | Numbers ≥ 1K |
| 1234567890 bytes | 1.15 GB | Byte values |
| 0.8567 | 85.67% | Percentage/ratio |
| 123.45 | 123.45 | Small numbers |

## File Naming Convention

**JSON Input:**
```
kubernetes___api_server_20260206_061711.json
```

**Markdown Output:**
```
kubernetes___api_server_20260206_061711.md
```

The converter preserves the original filename, only changing the extension.

## Statistics Calculation

For each metric with time-series data, the converter calculates:

- **Current:** Latest value in the time series
- **Min:** Minimum value over the time range
- **Max:** Maximum value over the time range  
- **Avg:** Average value over the time range

## Example Conversion

### Input JSON Structure
```json
{
  "timestamp": "2026-02-06T06:17:11Z",
  "time_range": "24h",
  "source": "Kubernetes / API server",
  "dashboard": "09ec8aa1e996d6ffcd6817bbaff4db1b",
  "metrics": {
    "cpu_usage_a": {
      "result": [
        {
          "values": [
            [1738825031, "1234"],
            [1738828631, "2345"],
            [1738832231, "3456"]
          ]
        }
      ]
    }
  }
}
```

### Output Markdown
```markdown
# Kubernetes / API Server

**Collection Date:** 2026-02-06
**Collection Time:** 06:17:11 WITA
**Time Range:** 24h
**Dashboard UID:** 09ec8aa1e996d6ffcd6817bbaff4db1b

---

## 📊 Metrics Summary

- **Total Metrics Collected:** 1/1
- **Collection Status:** ✅ Complete

## 📈 Metric Details

### 1. Cpu Usage A

- **Current Value:** 3.46K
- **Min:** 1.23K
- **Max:** 3.46K
- **Avg:** 2.35K

---

*Report generated on 2026-02-06 06:22:15 WITA*
```

## Customization

### Modify Report Template

Edit `convert_metrics_to_markdown.py` function `generate_kubernetes_report()`:

```python
def generate_kubernetes_report(data, output_file):
    # Customize header
    report = f"""# {dashboard_name}
    
**Your Custom Field:** {custom_value}
...
```

### Add Custom Formatting

Add new formatting rules in the value formatting section:

```python
# Format based on metric name
if 'bytes' in metric_name.lower():
    formatted_value = format_bytes(value)
elif 'your_custom_metric' in metric_name.lower():
    formatted_value = your_custom_format(value)
```

### Filter Specific Metrics

Modify the exclusion logic:

```python
exclude_patterns = ['summary', 'upload_results', 'zitadel', 'your_pattern']
```

## Integration with Workflow

The conversion step runs automatically in the GitHub Actions workflow:

```yaml
- name: Convert All Metrics to Markdown
  if: success()
  run: |
    echo "📄 Converting all Kubernetes metrics to Markdown reports"
    chmod +x .github/scripts/convert_metrics_to_markdown.py
    python3 .github/scripts/convert_metrics_to_markdown.py grafana-metrics
    
    MD_COUNT=$(ls -1 grafana-metrics/*.md 2>/dev/null | wc -l)
    echo "✅ Generated $MD_COUNT Markdown reports"
```

## Viewing Reports

### Option 1: MinIO Browser
1. Go to https://minio.pkc.pub/browser/pkc/grafana-metrics/
2. Navigate to date folder (e.g., `2026-02-06/`)
3. Click on `.md` files to view in browser

### Option 2: Download and View Locally
```bash
# Download all reports for a specific date
mc mirror minio/pkc/grafana-metrics/2026-02-06/ ./local-reports/

# View with any Markdown viewer
open local-reports/*.md
```

### Option 3: Direct URL Access
```
https://minio.pkc.pub/pkc/grafana-metrics/2026-02-06/kubernetes___api_server_20260206_061711.md
```

## Troubleshooting

### Conversion Script Not Found
```bash
# Make script executable
chmod +x .github/scripts/convert_metrics_to_markdown.py
```

### No Markdown Files Generated
Check that:
1. JSON files exist in the metrics directory
2. JSON files are valid (not corrupted)
3. JSON files are not in the exclusion list
4. Script has proper permissions

### Formatting Issues
- Verify Python 3.x is installed
- Check that `pytz` module is available
- Ensure JSON structure matches expected format

### Empty Metrics
If a Markdown file shows "No metric data available":
- Check the source JSON file for data
- Verify Prometheus queries returned results
- Check Grafana datasource connectivity

## Best Practices

1. **Always convert after collection** - Run conversion immediately after collecting metrics
2. **Keep JSON files** - Don't delete JSON files; they're the source of truth
3. **Version control templates** - Track changes to report templates
4. **Monitor conversion logs** - Check GitHub Actions logs for errors
5. **Regular cleanup** - Archive old reports from MinIO periodically

## Related Documentation

- [Grafana Metrics Pipeline](./GRAFANA-METRICS-PIPELINE.md) - Complete pipeline documentation
- [Grafana Dashboard Observability](./GRAFANA-DASHBOARD-OBSERVABILITY.md) - Dashboard setup guide

---

*Last Updated: 2026-02-06*
