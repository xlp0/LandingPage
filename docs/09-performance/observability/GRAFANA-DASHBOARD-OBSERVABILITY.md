# Grafana Dashboard Observability

**Project:** PKC Landing Page  
**Version:** 1.0.0  
**Last Updated:** 2026-02-04  
**Status:** Production  
**Grafana Instance:** https://grafana.pkc.pub

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Dashboard Catalog](#dashboard-catalog)
4. [Metrics Collection](#metrics-collection)
5. [Data Sources](#data-sources)
6. [Automated Monitoring](#automated-monitoring)
7. [Query Examples](#query-examples)
8. [Integration Guide](#integration-guide)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

---

## Overview

### Purpose

The PKC Landing Page project implements a comprehensive observability stack using **Grafana** for visualization and monitoring. This system provides real-time insights into:

- **Kubernetes cluster health** and resource utilization
- **Application performance** metrics and user behavior
- **Authentication and user management** through ZITADEL integration
- **System-level metrics** including networking, storage, and compute resources

### Key Features

- ✅ **16 Production Dashboards** covering Kubernetes infrastructure and authentication
- ✅ **Automated Metrics Collection** via GitHub Actions (daily at 06:00 AM WITA)
- ✅ **Real User Monitoring (RUM)** with Grafana Faro
- ✅ **Log Aggregation** using Loki for centralized logging
- ✅ **MinIO Storage Integration** for metrics persistence and historical analysis
- ✅ **ZITADEL Authentication Monitoring** with automated reporting

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Visualization** | Grafana 10.2.3+ | Dashboard and alerting platform |
| **Metrics Storage** | Prometheus | Time-series database for metrics |
| **Log Aggregation** | Loki | Log storage and querying |
| **Log Shipping** | Promtail | Log collection and forwarding |
| **Frontend Monitoring** | Grafana Faro | Real user monitoring (RUM) |
| **Object Storage** | MinIO | Metrics backup and historical data |
| **Orchestration** | Kubernetes | Container orchestration |

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Browser                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  PKC Landing Page Application                            │  │
│  │  - Component interactions                                 │  │
│  │  - User sessions                                          │  │
│  │  - Performance metrics                                    │  │
│  └────────────────────┬─────────────────────────────────────┘  │
└───────────────────────┼─────────────────────────────────────────┘
                        │
                        │ Faro SDK
                        ▼
        ┌───────────────────────────────┐
        │   Grafana Faro Collector      │
        │   - Real User Monitoring      │
        │   - Error tracking            │
        │   - Performance data          │
        └───────────────┬───────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Prometheus  │  │     Loki     │  │   Grafana    │       │
│  │  - Metrics   │  │  - Logs      │  │  - Dashboards│       │
│  │  - Scraping  │  │  - Queries   │  │  - Alerts    │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                  │                  │                │
│  ┌──────▼──────────────────▼──────────────────▼──────┐       │
│  │         Kubernetes Metrics & Logs                  │       │
│  │  - Node metrics      - Pod metrics                 │       │
│  │  - Network metrics   - Storage metrics             │       │
│  │  - API server logs   - Application logs            │       │
│  └────────────────────────────────────────────────────┘       │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        │ GitHub Actions
                        ▼
        ┌───────────────────────────────┐
        │   Automated Collection        │
        │   - Daily metrics export      │
        │   - ZITADEL report generation │
        │   - MinIO storage upload      │
        └───────────────┬───────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │   MinIO Object Storage        │
        │   - Historical metrics        │
        │   - Generated reports         │
        │   - Backup archives           │
        └───────────────────────────────┘
```

### Data Flow

1. **Application Layer**: Frontend sends metrics via Faro SDK
2. **Collection Layer**: Prometheus scrapes metrics, Promtail collects logs
3. **Storage Layer**: Time-series data stored in Prometheus, logs in Loki
4. **Visualization Layer**: Grafana queries data sources and renders dashboards
5. **Automation Layer**: GitHub Actions exports metrics daily to MinIO
6. **Archive Layer**: MinIO stores historical data for long-term analysis

---

## Dashboard Catalog

### Kubernetes Infrastructure Dashboards (15)

#### 1. Kubernetes / API Server
**Dashboard ID:** `k8s-api-server`  
**Purpose:** Monitor Kubernetes API server performance and health  
**Key Metrics:**
- API request rate and latency (P50, P95, P99)
- Request errors by verb and resource
- API server resource utilization (CPU, memory)
- Admission controller performance
- Webhook latency

**Use Cases:**
- Detect API server bottlenecks
- Monitor control plane health
- Troubleshoot kubectl command slowness
- Track API deprecation usage

---

#### 2. Kubernetes / Compute Resources / Cluster
**Dashboard ID:** `k8s-compute-cluster`  
**Purpose:** Cluster-wide resource utilization overview  
**Key Metrics:**
- Total CPU usage and allocation
- Total memory usage and allocation
- Pod count and distribution
- Node count and status
- Resource requests vs. limits

**Use Cases:**
- Capacity planning
- Identify resource over/under-provisioning
- Monitor cluster growth trends
- Detect resource exhaustion

---

#### 3. Kubernetes / Compute Resources / Namespace (Pods)
**Dashboard ID:** `k8s-compute-namespace-pods`  
**Purpose:** Namespace-level pod resource monitoring  
**Key Metrics:**
- CPU usage per namespace
- Memory usage per namespace
- Pod count per namespace
- Resource quota utilization
- Top resource-consuming pods

**Use Cases:**
- Namespace resource allocation
- Multi-tenant resource management
- Cost allocation by namespace
- Identify resource-hungry applications

---

#### 4. Kubernetes / Compute Resources / Namespace (Workloads)
**Dashboard ID:** `k8s-compute-namespace-workloads`  
**Purpose:** Workload-level resource analysis  
**Key Metrics:**
- Deployment resource usage
- StatefulSet resource usage
- DaemonSet resource usage
- Job/CronJob resource usage
- Replica count and status

**Use Cases:**
- Workload performance optimization
- Right-sizing deployments
- Troubleshoot workload issues
- Monitor scaling behavior

---

#### 5. Kubernetes / Compute Resources / Node (Pods)
**Dashboard ID:** `k8s-compute-node-pods`  
**Purpose:** Node-level pod distribution and resource usage  
**Key Metrics:**
- Pods per node
- CPU usage per node
- Memory usage per node
- Node capacity and allocatable resources
- Pod scheduling patterns

**Use Cases:**
- Node balancing
- Identify hot nodes
- Troubleshoot scheduling issues
- Monitor node health

---

#### 6. Kubernetes / Compute Resources / Pod
**Dashboard ID:** `k8s-compute-pod`  
**Purpose:** Individual pod performance monitoring  
**Key Metrics:**
- Container CPU usage
- Container memory usage
- Container restart count
- Container resource limits
- Container network I/O

**Use Cases:**
- Debug pod performance issues
- Monitor container health
- Identify memory leaks
- Track restart patterns

---

#### 7. Kubernetes / Controller Manager
**Dashboard ID:** `k8s-controller-manager`  
**Purpose:** Monitor controller manager operations  
**Key Metrics:**
- Controller work queue depth
- Controller sync latency
- Controller error rate
- Reconciliation rate
- Leader election status

**Use Cases:**
- Troubleshoot controller issues
- Monitor control loop performance
- Detect reconciliation delays
- Track controller health

---

#### 8. Kubernetes / Kubelet
**Dashboard ID:** `k8s-kubelet`  
**Purpose:** Monitor kubelet agent performance on nodes  
**Key Metrics:**
- Kubelet CPU and memory usage
- Pod lifecycle operations (create, delete, update)
- Container runtime operations
- Volume operations
- PLEG (Pod Lifecycle Event Generator) latency

**Use Cases:**
- Node agent health monitoring
- Troubleshoot pod startup issues
- Monitor container runtime performance
- Detect kubelet bottlenecks

---

#### 9. Kubernetes / Networking / Cluster
**Dashboard ID:** `k8s-networking-cluster`  
**Purpose:** Cluster-wide network traffic and performance  
**Key Metrics:**
- Total network throughput (ingress/egress)
- Network errors and drops
- Service endpoint count
- Network policy count
- DNS query rate

**Use Cases:**
- Network capacity planning
- Identify network bottlenecks
- Monitor service mesh performance
- Troubleshoot connectivity issues

---

#### 10. Kubernetes / Networking / Namespace (Pods)
**Dashboard ID:** `k8s-networking-namespace-pods`  
**Purpose:** Namespace-level pod network metrics  
**Key Metrics:**
- Network bandwidth per namespace
- Packet rate per namespace
- Network errors per namespace
- Top network-consuming pods
- Inter-namespace traffic

**Use Cases:**
- Network cost allocation
- Identify chatty applications
- Monitor microservice communication
- Troubleshoot network performance

---

#### 11. Kubernetes / Networking / Namespace (Workload)
**Dashboard ID:** `k8s-networking-namespace-workload`  
**Purpose:** Workload-level network analysis  
**Key Metrics:**
- Network I/O per deployment
- Service-to-service traffic
- Ingress/egress patterns
- Network latency
- Connection count

**Use Cases:**
- Service dependency analysis
- API gateway monitoring
- Load balancer performance
- Traffic pattern analysis

---

#### 12. Kubernetes / Networking / Pod
**Dashboard ID:** `k8s-networking-pod`  
**Dashboard URL:** https://grafana.pkc.pub/d/7a18067ce943a40ae25454675c19ff5c/kubernetes-networking-pod  
**Purpose:** Individual pod network monitoring  
**Key Metrics:**
- Pod network bandwidth
- Pod packet rate
- Pod network errors
- Container network I/O
- TCP connection states

**Use Cases:**
- Debug pod connectivity
- Monitor container network usage
- Identify network-intensive containers
- Troubleshoot DNS issues

---

#### 13. Kubernetes / Persistent Volumes
**Dashboard ID:** `k8s-persistent-volumes`  
**Purpose:** Storage resource monitoring  
**Key Metrics:**
- PV capacity and usage
- PVC status and binding
- Storage class usage
- Volume provisioning rate
- I/O operations per second (IOPS)

**Use Cases:**
- Storage capacity planning
- Monitor volume health
- Troubleshoot storage issues
- Track storage costs

---

#### 14. Kubernetes / Proxy
**Dashboard ID:** `k8s-proxy`  
**Purpose:** Monitor kube-proxy performance  
**Key Metrics:**
- Proxy rule sync latency
- Service endpoint sync rate
- iptables rule count
- Proxy CPU and memory usage
- Network rule processing time

**Use Cases:**
- Service routing performance
- Troubleshoot service connectivity
- Monitor proxy health
- Detect routing issues

---

#### 15. Kubernetes / Scheduler
**Dashboard ID:** `k8s-scheduler`  
**Purpose:** Monitor scheduler operations and performance  
**Key Metrics:**
- Scheduling latency (P50, P95, P99)
- Scheduling attempts and failures
- Pod scheduling rate
- Pending pods count
- Scheduler queue depth

**Use Cases:**
- Troubleshoot pod scheduling delays
- Monitor scheduler health
- Identify scheduling bottlenecks
- Track resource constraints

---

### Authentication & User Management Dashboard (1)

#### 16. ZITADEL Authentication & User Monitoring
**Dashboard ID:** `zitadel-auth`  
**Dashboard URL:** https://grafana.pkc.pub/d/zitadel-auth/zitadel-authentication-and-user-monitoring  
**Purpose:** Monitor authentication system and user activity  
**Key Metrics:**

**Authentication Metrics:**
- `active_sessions` - Total active user sessions
- `failed_logins` - Rate of failed authentication attempts
- `successful_logins` - Rate of successful authentications
- `auth_requests` - Rate of authentication requests
- `token_requests` - Rate of token issuance requests

**User Metrics:**
- `active_users` - Total active users in the system
- `registered_users` - Total registered user accounts

**System Metrics:**
- `api_calls` - Rate of API calls to ZITADEL
- `database_connections` - Number of active database connections
- `cache_hit_rate` - Cache performance ratio

**Event Types Tracked:**
- `oidc_session.access_token.added` - OAuth2 access token generation
- `oidc_session.added` - New OIDC session creation
- `user.human.externallogin.check.succeeded` - External login success
- `user.human.mfa.init.skipped` - MFA initialization skipped
- `user.human.mfa.otp.added` - OTP MFA method added
- `user.human.password.check.succeeded` - Password verification success
- `user.token.v2.added` - User token generation

**Use Cases:**
- Monitor authentication health
- Detect suspicious login patterns
- Track user growth
- Identify authentication bottlenecks
- Security incident detection
- User behavior analysis

---

## Metrics Collection

### Automated Collection System

The project implements an automated metrics collection system using **GitHub Actions** that runs daily to export dashboard data.

#### Collection Schedule

- **Frequency:** Daily at 06:00 AM Bali Time (WITA/UTC+8)
- **Cron Expression:** `0 22 * * *` (22:00 UTC = 06:00 WITA next day)
- **Manual Trigger:** Available via GitHub Actions workflow dispatch

#### Collection Process

```yaml
Workflow: .github/workflows/grafana-metrics-collector.yml

Steps:
1. Checkout repository
2. Set up Python 3.11 environment
3. Install dependencies (requests, pandas, minio, python-dateutil, pytz)
4. Create metrics directory
5. Collect metrics from all 16 dashboards
6. Generate ZITADEL report with visualizations
7. Upload to MinIO storage
8. Archive as GitHub artifacts (30-day retention)
```

#### Collected Data Format

**Metrics Files:**
```json
{
  "timestamp": "2026-02-04T01:00:00+00:00",
  "time_range": "24h",
  "source": "Grafana",
  "dashboard": "kubernetes-api-server",
  "metrics": {
    "metric_name": {
      "status": "success",
      "data": {
        "resultType": "matrix",
        "result": [...]
      }
    }
  }
}
```

**Summary File:**
```json
{
  "collection_time": "2026-02-04T01:00:00+00:00",
  "time_range": "24h",
  "total_dashboards": 16,
  "collected": 16,
  "total_metrics": 450,
  "output_directory": "grafana-metrics"
}
```

#### Storage Structure

**MinIO Bucket:** `pkc`  
**Path Structure:**
```
pkc/
└── grafana-metrics/
    ├── 2026-02-04/
    │   ├── kubernetes_api_server_20260204_010000.json
    │   ├── kubernetes_compute_resources_cluster_20260204_010000.json
    │   ├── kubernetes_networking_pod_20260204_010000.json
    │   ├── zitadel_authentication_&_user_monitoring_20260204_010000.json
    │   ├── zitadel_authentication_&_user_monitoring_20260204_010000.md
    │   ├── ... (16 dashboard files total)
    │   ├── latest_summary.json
    │   └── upload_results.json
    └── 2026-02-05/
        └── ...
```

**Public Access:** https://minio.pkc.pub/browser/pkc/grafana-metrics/{date}

---

## Data Sources

### Prometheus

**Type:** Time-series database  
**Purpose:** Metrics storage and querying  
**Datasource ID:** 1 (default)

**Configuration:**
- **URL:** Internal Kubernetes service endpoint
- **Scrape Interval:** 15 seconds
- **Retention:** 15 days (default)
- **Query Timeout:** 30 seconds

**Metrics Collected:**
- Container metrics (cAdvisor)
- Node metrics (node-exporter)
- Kubernetes API metrics
- Custom application metrics

### Loki

**Type:** Log aggregation system  
**Purpose:** Centralized logging and log queries  
**Datasource ID:** 2

**Configuration:**
- **URL:** Internal Kubernetes service endpoint
- **Log Retention:** 7 days (default)
- **Max Query Range:** 24 hours
- **Label Indexing:** Enabled

**Log Sources:**
- Application logs (via Promtail)
- Kubernetes system logs
- Container stdout/stderr
- Custom application logs

### Grafana Faro

**Type:** Real User Monitoring (RUM)  
**Purpose:** Frontend observability and user behavior tracking  
**Collector URL:** https://faro-collector-prod-us-central-0.grafana.net/collect/{APP_KEY}

**Configuration:**
```javascript
const faro = window.GrafanaFaroWebSdk.initializeFaro({
    url: 'YOUR_FARO_COLLECTOR_URL',
    app: {
        name: 'PKC Landing Page',
        version: '1.0.0',
        environment: 'production'
    },
    instrumentations: [
        ...window.GrafanaFaroWebSdk.getWebInstrumentations({
            captureConsole: true,
            captureConsoleDisabledLevels: []
        })
    ]
});
```

**Tracked Events:**
- Component visits and navigation
- Component load times
- User interactions
- JavaScript errors
- Performance metrics (Core Web Vitals)

---

## Automated Monitoring

### ZITADEL Report Generation

The system automatically generates comprehensive Markdown reports for ZITADEL authentication metrics with Mermaid.js visualizations.

#### Report Features

- ✅ **24-hour data points** with hourly granularity
- ✅ **Mermaid.js visualizations** (line charts, bar charts, pie charts)
- ✅ **Event distribution analysis** across 7 authentication event types
- ✅ **User growth tracking** with trend analysis
- ✅ **Automated upload** to MinIO alongside JSON metrics

#### Report Contents

1. **Executive Summary**
   - Total registered users
   - Authentication event count
   - Time range covered
   - Key trends

2. **User Growth Analysis**
   - 24-hour registered user trend (line chart)
   - User growth rate
   - Peak registration times

3. **Authentication Events**
   - Event type breakdown (bar chart)
   - Event distribution (pie chart)
   - Hourly event patterns
   - Success/failure rates

4. **Event Timeline**
   - Chronological event listing
   - Event type distribution
   - Timestamp analysis

#### Generation Process

```bash
# Automated via GitHub Actions
python3 daily-reports/generate_zitadel_report.py \
  grafana-metrics/zitadel_authentication_*_user_monitoring_*.json \
  grafana-metrics/zitadel_report.md
```

#### Report Template

**Location:** `daily-reports/zitadel_report_template.md`  
**Generator:** `daily-reports/generate_zitadel_report.py`  
**Output:** `grafana-metrics/{date}/zitadel_report.md`

---

## Query Examples

### LogQL Queries (Loki)

#### Component Visit Tracking
```logql
# Total component visits in last 24 hours
count_over_time({job="clm-frontend", event="component_visit"} [24h])

# Visits by component
sum by (component_name) (
    count_over_time({job="clm-frontend", event="component_visit"} [24h])
)

# Average time per component
avg by (component) (
    avg_over_time({job="clm-frontend", event="component_exit"} 
    | json 
    | unwrap duration_seconds [24h])
)

# Active users in last hour
count(count by (user_id) ({job="clm-frontend", event="component_visit"} [1h]))
```

#### Error Tracking
```logql
# All errors in last 24 hours
{app="PKC Landing Page", kind="exception"}

# Error count by component
sum by (component_hash) (
    count_over_time({app="PKC Landing Page", kind="exception"} [24h])
)

# Error rate
rate({app="PKC Landing Page", kind="exception"} [5m])
```

### PromQL Queries (Prometheus)

#### Kubernetes Metrics
```promql
# Node CPU usage
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Pod memory usage
sum(container_memory_working_set_bytes{pod!=""}) by (pod, namespace)

# API server request rate
rate(apiserver_request_total[5m])

# Pod restart count
kube_pod_container_status_restarts_total
```

#### ZITADEL Metrics
```promql
# Active sessions
zitadel_active_sessions

# Failed login rate
rate(zitadel_failed_logins[5m])

# Successful login rate
rate(zitadel_successful_logins[5m])

# API call rate
rate(zitadel_api_calls[5m])
```

---

## Integration Guide

### Frontend Integration (Grafana Faro)

#### Step 1: Install Faro SDK

Add to `index.html` before closing `</body>` tag:

```html
<!-- Grafana Faro Web SDK -->
<script src="https://unpkg.com/@grafana/faro-web-sdk@^1.3.0/dist/bundle/faro-web-sdk.iife.js"></script>
<script>
    const faro = window.GrafanaFaroWebSdk.initializeFaro({
        url: 'YOUR_FARO_COLLECTOR_URL',
        app: {
            name: 'PKC Landing Page',
            version: '1.0.0',
            environment: 'production'
        },
        instrumentations: [
            ...window.GrafanaFaroWebSdk.getWebInstrumentations({
                captureConsole: true,
                captureConsoleDisabledLevels: []
            })
        ]
    });

    console.log('[Faro] Initialized successfully');
</script>
```

#### Step 2: Track Component Visits

Add Redux middleware for component tracking:

```javascript
const faroMiddleware = store => next => action => {
    const result = next(action);
    
    if (action.type === 'clm/setActiveComponent') {
        const state = store.getState();
        const component = state.clm.registry.components.find(
            c => c.hash === action.payload
        );
        
        if (component && window.faro) {
            window.faro.api.pushEvent('clm_component_visit', {
                component_hash: component.hash,
                component_name: component.name,
                timestamp: Date.now(),
                user_agent: navigator.userAgent,
                screen_width: window.innerWidth,
                screen_height: window.innerHeight
            });
        }
    }
    
    return result;
};
```

### Dashboard Embedding

#### Embed in Application

```html
<!-- Kubernetes Nodes Health Dashboard -->
<iframe 
    id="dashboardFrame" 
    data-src="https://grafana.pkc.pub/d/k8s-nodes-health/kubernetes-nodes-health-monitoring?orgId=1&from=now-1h&to=now&timezone=browser&refresh=30s"
    style="border: 0; width: 100%; height: 100%;" 
    frameborder="0" 
    scrolling="yes">
</iframe>
```

#### Lazy Loading Implementation

```javascript
// Lazy load iframe on view
function lazyLoadDashboard(iframeId) {
    const iframe = document.getElementById(iframeId);
    const dataSrc = iframe.getAttribute('data-src');
    
    if (dataSrc && !iframe.src) {
        console.log('[Dashboard] Loading:', iframeId);
        iframe.src = dataSrc;
    }
}
```

### CLM Registry Integration

Add observability metadata to components:

```yaml
- hash: "grafana-k8s-networking"
  name: "Grafana Kubernetes Networking Dashboard"
  abstract:
    context: "Kubernetes cluster monitoring and observability"
    goal: "Display real-time Kubernetes pod networking metrics"
  concrete:
    implementation: "components/grafana-dashboard.html"
    sandbox: "allow-scripts allow-same-origin"
  balanced:
    metrics_endpoint: "/metrics/grafana-k8s"
    health_check: "/health/grafana-k8s"
    expected_load_time_ms: 1000
    observability:
      dashboard_type: "Kubernetes Networking"
      dashboard_url: "https://grafana.pkc.pub/d/7a18067ce943a40ae25454675c19ff5c/kubernetes-networking-pod"
      refresh_interval: "10s"
      time_range: "1h"
```

---

## Troubleshooting

### Common Issues

#### Issue: Grafana Dashboard Not Loading

**Symptoms:**
- Blank iframe or error message
- "Failed to load application files" error

**Solutions:**
1. Check reverse proxy settings
2. Verify `root_url` in `grafana.ini` includes subpath
3. Set `serve_from_sub_path = true` if not using reverse proxy
4. Restart grafana-server: `kubectl rollout restart deployment/grafana`
5. Verify browser compatibility (Chrome, Firefox, Safari supported)

#### Issue: No Metrics Data

**Symptoms:**
- Empty panels in dashboards
- "No data" messages

**Solutions:**
1. Verify Prometheus datasource connection
2. Check Prometheus targets: `https://grafana.pkc.pub/api/datasources/proxy/1/api/v1/targets`
3. Verify time range selection (try "Last 1 hour")
4. Check metric names in Grafana Explore
5. Verify Prometheus scrape configuration

#### Issue: Faro Events Not Tracked

**Symptoms:**
- No component visit data
- Missing user behavior metrics

**Solutions:**
1. Verify Faro initialization in browser console
2. Check network tab for requests to `faro-collector`
3. Verify `window.faro` is defined
4. Check Redux middleware is added to store
5. Wait 1-2 minutes for data ingestion delay

#### Issue: Automated Collection Failing

**Symptoms:**
- GitHub Actions workflow fails
- No new metrics in MinIO

**Solutions:**
1. Verify GitHub Secrets are set correctly:
   - `GRAFANA_USERNAME`
   - `GRAFANA_PASSWORD`
   - `MINIO_ACCESS_KEY`
   - `MINIO_SECRET_KEY`
2. Check workflow logs in GitHub Actions
3. Verify Grafana API health: `https://grafana.pkc.pub/api/health`
4. Test MinIO connection manually
5. Verify MinIO endpoint format (no `https://` prefix)

#### Issue: MinIO Upload Fails

**Symptoms:**
- Metrics collected but not uploaded
- Connection timeout errors

**Solutions:**
1. Verify MinIO endpoint: `minio.pkc.pub` (not `https://minio.pkc.pub`)
2. Check MinIO credentials in GitHub Secrets
3. Verify bucket permissions (bucket: `pkc`)
4. Test connection: `mc alias set myminio https://minio.pkc.pub ACCESS_KEY SECRET_KEY`
5. Check MinIO server status

---

## Best Practices

### Dashboard Design

1. **Use Consistent Time Ranges**
   - Default to "Last 1 hour" for real-time monitoring
   - Use "Last 24 hours" for trend analysis
   - Enable auto-refresh (10s-30s) for live dashboards

2. **Organize Panels Logically**
   - Place most important metrics at the top
   - Group related metrics together
   - Use consistent color schemes
   - Add descriptive panel titles and descriptions

3. **Optimize Query Performance**
   - Use appropriate time ranges
   - Limit data points with rate/increase functions
   - Use recording rules for complex queries
   - Cache frequently accessed data

4. **Implement Alerting**
   - Set meaningful thresholds
   - Avoid alert fatigue with proper grouping
   - Use notification channels (email, Slack)
   - Document alert runbooks

### Metrics Collection

1. **Label Management**
   - Use consistent label naming
   - Avoid high-cardinality labels
   - Document label meanings
   - Use label matchers efficiently

2. **Data Retention**
   - Balance storage costs with data needs
   - Use downsampling for long-term storage
   - Archive important metrics to MinIO
   - Implement retention policies

3. **Security**
   - Rotate credentials regularly
   - Use HTTPS for all connections
   - Implement authentication for dashboards
   - Audit access logs regularly

4. **Documentation**
   - Document all dashboards and panels
   - Maintain query examples
   - Create troubleshooting guides
   - Keep runbooks up-to-date

### Performance Optimization

1. **Frontend Monitoring**
   - Sample user sessions appropriately
   - Reduce event frequency for high-traffic apps
   - Use error sampling to reduce noise
   - Monitor Faro SDK performance impact

2. **Backend Monitoring**
   - Use efficient PromQL queries
   - Implement query result caching
   - Optimize scrape intervals
   - Monitor Prometheus resource usage

3. **Storage Optimization**
   - Compress metrics data
   - Use appropriate retention periods
   - Archive old data to object storage
   - Monitor storage growth trends

---

## References

### Official Documentation

- [Grafana Documentation](https://grafana.com/docs/grafana/latest/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/latest/)
- [Grafana Faro Documentation](https://grafana.com/docs/grafana-cloud/faro-web-sdk/)
- [PromQL Guide](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [LogQL Guide](https://grafana.com/docs/loki/latest/logql/)

### Project Documentation

- [Grafana Loki Setup Plan](./grafana-loki-setup-plan.md)
- [Grafana Cloud Setup Steps](./grafana-cloud-setup-steps.md)
- [Client-Side Tracking](./client-side-tracking.md)
- [Grafana Faro Queries](./grafana-faro-queries.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [GitHub Actions README](../../.github/workflows/README-GRAFANA-METRICS.md)

### External Resources

- [Grafana Dashboards Library](https://grafana.com/grafana/dashboards/)
- [Kubernetes Monitoring Guide](https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/)
- [ZITADEL Documentation](https://zitadel.com/docs)
- [MinIO Documentation](https://min.io/docs/)

---

## Appendix

### Dashboard Access URLs

| Dashboard | URL |
|-----------|-----|
| **Main Grafana** | https://grafana.pkc.pub |
| **Kubernetes Nodes Health** | https://grafana.pkc.pub/d/k8s-nodes-health/kubernetes-nodes-health-monitoring |
| **Kubernetes Networking Pod** | https://grafana.pkc.pub/d/7a18067ce943a40ae25454675c19ff5c/kubernetes-networking-pod |
| **ZITADEL Auth** | https://grafana.pkc.pub/d/zitadel-auth/zitadel-authentication-and-user-monitoring |
| **All Dashboards** | https://grafana.pkc.pub/dashboards |

### MinIO Access

- **Web Console:** https://minio.pkc.pub
- **Metrics Bucket:** https://minio.pkc.pub/browser/pkc/grafana-metrics
- **API Endpoint:** minio.pkc.pub (use with `secure=True`)

### GitHub Actions

- **Workflow File:** `.github/workflows/grafana-metrics-collector.yml`
- **Collection Script:** `.github/scripts/collect_grafana_metrics.py`
- **Upload Script:** `.github/scripts/upload_metrics_to_minio.py`
- **Report Generator:** `daily-reports/generate_zitadel_report.py`

---

**Document Version:** 1.0.0  
**Last Updated:** 2026-02-04  
**Maintained By:** PKC Landing Page Team  
**Status:** ✅ Production Ready
