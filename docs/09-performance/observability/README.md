# Grafana Metrics Collection & Conversion System

## 📚 Documentation Index

This directory contains comprehensive documentation for the automated Grafana metrics collection, conversion, and storage pipeline.

### Quick Links

| Document | Purpose | Audience |
|----------|---------|----------|
| **[GRAFANA-METRICS-PIPELINE.md](./GRAFANA-METRICS-PIPELINE.md)** | Complete pipeline architecture and components | DevOps, Developers |
| **[METRICS-CONVERSION-GUIDE.md](./METRICS-CONVERSION-GUIDE.md)** | JSON to Markdown conversion guide | Users, Developers |
| **[PIPELINE-WORKFLOW-DIAGRAM.md](./PIPELINE-WORKFLOW-DIAGRAM.md)** | Visual workflow diagrams | All users |
| **[GRAFANA-DASHBOARD-OBSERVABILITY.md](./GRAFANA-DASHBOARD-OBSERVABILITY.md)** | Dashboard setup and configuration | DevOps |

---

## 🚀 Quick Start

### View Latest Reports

**MinIO Browser:**
```
https://minio.pkc.pub/browser/pkc/grafana-metrics/2026-02-06/
```

**Direct Download:**
```bash
# List all reports for today
curl https://minio.pkc.pub/pkc/grafana-metrics/2026-02-06/

# Download specific report
curl -O https://minio.pkc.pub/pkc/grafana-metrics/2026-02-06/kubernetes___api_server_20260206_061711.md
```

### Run Pipeline Manually

```bash
# Trigger via GitHub CLI
gh workflow run grafana-metrics-collector.yml

# With custom time range
gh workflow run grafana-metrics-collector.yml -f time_range=6h
```

---

## 📊 What This System Does

### Automated Daily Collection
- **When:** Every day at 06:00 AM WITA (22:00 UTC)
- **What:** Collects metrics from 15+ Grafana dashboards
- **Output:** JSON files with raw metrics data

### Intelligent Conversion
- **Converts:** JSON metrics → Readable Markdown reports
- **Formats:** Numbers, bytes, percentages for human readability
- **Statistics:** Min, Max, Avg calculations for each metric

### Secure Storage
- **Where:** MinIO object storage at minio.pkc.pub
- **Organization:** By date (YYYY-MM-DD folders)
- **Formats:** Both JSON (raw data) and MD (reports) available

---

## 📁 Available Reports

### Kubernetes Metrics
1. **API Server** - API request rates, latencies, errors
2. **Compute Resources**
   - Cluster-level CPU, memory, storage
   - Namespace-level pod and workload resources
   - Node-level pod resources
   - Individual pod resources
3. **Networking**
   - Cluster network traffic
   - Namespace workload networking
   - Pod-level network metrics
4. **Components**
   - Kubelet metrics
   - Scheduler performance
   - Persistent volume usage

### Authentication & Users
- **ZITADEL** - User registrations, authentication events, session tracking

---

## 🔄 Pipeline Flow

```
Grafana Dashboards
        ↓
   [Collect Metrics]
        ↓
    JSON Files
        ↓
   [Convert to MD]
        ↓
  Markdown Reports
        ↓
  [Upload to MinIO]
        ↓
   Available Online
```

**Processing Time:** ~20 minutes for complete collection and conversion

---

## 📈 Report Format

Each Markdown report includes:

- **Header:** Date, time, time range, dashboard info
- **Summary:** Metrics count, collection status
- **Details:** Each metric with current/min/max/avg values
- **Footer:** Generation timestamp

**Example:**
```markdown
# Kubernetes / API Server
**Collection Date:** 2026-02-06
**Time Range:** 24h

## 📊 Metrics Summary
- Total Metrics Collected: 45/50
- Collection Status: ✅ Complete

## 📈 Metric Details
### 1. Request Rate
- Current Value: 2.45K req/s
- Min: 1.23K
- Max: 3.67K
- Avg: 2.34K
```

---

## 🛠️ Technical Components

### Scripts
- `collect_grafana_metrics.py` - Collects metrics from Grafana API
- `generate_zitadel_report.py` - Generates ZITADEL-specific reports
- `convert_metrics_to_markdown.py` - Converts all Kubernetes metrics to MD
- `upload_metrics_to_minio.py` - Uploads files to MinIO storage

### Workflow
- `.github/workflows/grafana-metrics-collector.yml` - GitHub Actions automation

### Documentation
- Complete guides in `docs/09-performance/observability/`

---

## 🔐 Security

- All credentials stored in GitHub Secrets
- HTTPS/TLS encryption for all transfers
- MinIO access control and authentication
- No credentials in code or logs

---

## 📊 Data Retention

| Storage | Retention | Purpose |
|---------|-----------|---------|
| **MinIO** | Indefinite | Long-term storage and access |
| **GitHub Artifacts** | 30 days | Backup and debugging |
| **Local (CI)** | Workflow duration | Temporary processing |

---

## 🎯 Use Cases

### For DevOps Teams
- Monitor Kubernetes cluster health trends
- Track resource utilization over time
- Identify performance bottlenecks
- Capacity planning with historical data

### For Security Teams
- Review ZITADEL authentication patterns
- Track user registration trends
- Monitor failed login attempts
- Audit access patterns

### For Management
- Generate executive summaries
- Track infrastructure costs
- Report on system reliability
- Demonstrate compliance

---

## 🔧 Customization

### Add New Dashboards
Edit `collect_grafana_metrics.py`:
```python
dashboard_list = [
    ("your-dashboard-uid", "Your Dashboard Name"),
]
```

### Modify Report Format
Edit `convert_metrics_to_markdown.py`:
```python
def generate_kubernetes_report(data, output_file):
    # Customize report template here
```

### Change Schedule
Edit `.github/workflows/grafana-metrics-collector.yml`:
```yaml
schedule:
  - cron: '0 22 * * *'  # Modify time here
```

---

## 📞 Support

### Documentation
- [Complete Pipeline Guide](./GRAFANA-METRICS-PIPELINE.md)
- [Conversion Guide](./METRICS-CONVERSION-GUIDE.md)
- [Workflow Diagrams](./PIPELINE-WORKFLOW-DIAGRAM.md)

### Scripts Documentation
- [Scripts README](../../.github/scripts/README.md)

### Troubleshooting
Check the documentation files above for:
- Common errors and solutions
- Configuration issues
- Network connectivity problems
- Authentication failures

---

## 📝 Recent Updates

**2026-02-06:**
- ✅ Added automated Markdown conversion for all Kubernetes metrics
- ✅ Integrated conversion into GitHub Actions workflow
- ✅ Created comprehensive documentation suite
- ✅ Added visual workflow diagrams
- ✅ Implemented intelligent value formatting

---

## 🎓 Learning Resources

1. **Start Here:** [GRAFANA-METRICS-PIPELINE.md](./GRAFANA-METRICS-PIPELINE.md)
2. **Convert Metrics:** [METRICS-CONVERSION-GUIDE.md](./METRICS-CONVERSION-GUIDE.md)
3. **Understand Flow:** [PIPELINE-WORKFLOW-DIAGRAM.md](./PIPELINE-WORKFLOW-DIAGRAM.md)
4. **Setup Dashboards:** [GRAFANA-DASHBOARD-OBSERVABILITY.md](./GRAFANA-DASHBOARD-OBSERVABILITY.md)

---

*Last Updated: 2026-02-06*
