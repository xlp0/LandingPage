# Grafana & Loki Setup Plan

**Created:** 2025-12-02  
**Status:** Planning Phase  
**Owner:** Henry Koo  
**Project:** THK Mesh Landing Page Observability Stack

---

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Implementation Phases](#implementation-phases)
5. [Configuration Files](#configuration-files)
6. [Dashboard Design](#dashboard-design)
7. [Deployment Strategy](#deployment-strategy)
8. [Testing & Validation](#testing--validation)
9. [Maintenance & Monitoring](#maintenance--monitoring)

---

## Overview

### Objective
Set up a complete observability stack using **Grafana** (visualization) and **Loki** (log aggregation) to monitor the THK Mesh Landing Page application, including:
- Component health monitoring
- Performance metrics
- Error tracking
- User activity logs
- System resource usage

### Why Grafana + Loki?

| Feature | Benefit |
|---------|---------|
| **Loki** | Lightweight log aggregation (like Prometheus for logs) |
| **Grafana** | Powerful visualization and alerting |
| **Cost-Effective** | No indexing (unlike Elasticsearch) |
| **Cloud-Native** | Works well with Docker/Kubernetes |
| **Label-Based** | Similar to Prometheus query model |

### Current State
- ✅ CLM registry has observability endpoints defined
- ✅ Components log to console
- ✅ Express server (`ws-server.js`) serves application
- ❌ No centralized log collection
- ❌ No metrics visualization
- ❌ No alerting system

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Browser                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │Component │  │Component │  │Component │                 │
│  │  Logs    │  │  Logs    │  │  Logs    │                 │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                 │
└───────┼─────────────┼─────────────┼───────────────────────┘
        │             │             │
        └─────────────┴─────────────┘
                      │
                      ▼
        ┌─────────────────────────┐
        │   Express Server        │
        │   (ws-server.js)        │
        │   - Access Logs         │
        │   - Error Logs          │
        │   - Performance Metrics │
        └────────────┬────────────┘
                     │
                     ▼
        ┌─────────────────────────┐
        │   Promtail              │
        │   (Log Shipper)         │
        │   - Collects logs       │
        │   - Adds labels         │
        │   - Filters/transforms  │
        └────────────┬────────────┘
                     │
                     ▼
        ┌─────────────────────────┐
        │   Loki                  │
        │   (Log Aggregation)     │
        │   - Stores logs         │
        │   - Indexes labels      │
        │   - Query API           │
        └────────────┬────────────┘
                     │
                     ▼
        ┌─────────────────────────┐
        │   Grafana               │
        │   (Visualization)       │
        │   - Dashboards          │
        │   - Alerts              │
        │   - Query builder       │
        └─────────────────────────┘
```

### Data Flow

1. **Application Logs** → Express server console
2. **Promtail** → Scrapes logs from files/stdout
3. **Loki** → Stores logs with labels
4. **Grafana** → Queries Loki and visualizes

---

## Components

### 1. Loki (Log Aggregation)

**Purpose:** Collect and store logs efficiently

**Key Features:**
- Label-based indexing (not full-text)
- S3-compatible storage
- Multi-tenancy support
- LogQL query language

**Configuration:**
```yaml
# loki-config.yml
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
  chunk_idle_period: 5m
  chunk_retain_period: 30s

schema_config:
  configs:
    - from: 2024-01-01
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/index
    cache_location: /loki/cache
    shared_store: filesystem
  filesystem:
    directory: /loki/chunks

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h
```

### 2. Promtail (Log Shipper)

**Purpose:** Collect logs and ship to Loki

**Key Features:**
- Tail log files
- Add labels
- Parse structured logs
- Filter and transform

**Configuration:**
```yaml
# promtail-config.yml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  # Docker container logs
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        regex: '/(.*)'
        target_label: 'container'
      - source_labels: ['__meta_docker_container_log_stream']
        target_label: 'stream'
    pipeline_stages:
      - json:
          expressions:
            level: level
            message: message
            component: component
      - labels:
          level:
          component:

  # Application logs
  - job_name: application
    static_configs:
      - targets:
          - localhost
        labels:
          job: landingpage
          __path__: /var/log/landingpage/*.log
    pipeline_stages:
      - regex:
          expression: '^\[(?P<component>[^\]]+)\] (?P<message>.*)$'
      - labels:
          component:
```

### 3. Grafana (Visualization)

**Purpose:** Visualize logs and metrics

**Key Features:**
- Interactive dashboards
- Alerting
- Multiple data sources
- User management

**Configuration:**
```yaml
# grafana-config.yml
apiVersion: 1

datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    isDefault: true
    jsonData:
      maxLines: 1000
```

---

## Implementation Phases

### Phase 1: Local Development Setup (Week 1)

**Goal:** Get Grafana + Loki running locally

**Tasks:**
- [ ] Create `docker-compose.observability.yml`
- [ ] Configure Loki with local storage
- [ ] Configure Promtail to collect Docker logs
- [ ] Set up Grafana with Loki data source
- [ ] Create basic dashboard
- [ ] Test log flow end-to-end

**Deliverables:**
- Working local observability stack
- Basic dashboard showing logs
- Documentation for local setup

### Phase 2: Application Integration (Week 2)

**Goal:** Integrate application with observability stack

**Tasks:**
- [ ] Add structured logging to `ws-server.js`
- [ ] Add component-level logging
- [ ] Create log labels (component, level, user)
- [ ] Add performance metrics
- [ ] Add error tracking
- [ ] Test log queries

**Deliverables:**
- Structured logs from all components
- Labels for filtering
- Performance metrics

### Phase 3: Dashboard Development (Week 3)

**Goal:** Create comprehensive dashboards

**Tasks:**
- [ ] **Dashboard 1:** System Overview
  - Request rate
  - Error rate
  - Response time
  - Active users
- [ ] **Dashboard 2:** Component Health
  - Component load status
  - Component errors
  - Component timeouts
- [ ] **Dashboard 3:** User Activity
  - Page views
  - Component interactions
  - User sessions
- [ ] **Dashboard 4:** Error Analysis
  - Error breakdown by component
  - Error trends
  - Stack traces

**Deliverables:**
- 4 production-ready dashboards
- Dashboard JSON exports
- Screenshots for documentation

### Phase 4: Alerting Setup (Week 4)

**Goal:** Set up proactive monitoring

**Tasks:**
- [ ] Configure alert rules
- [ ] Set up notification channels (email, Slack)
- [ ] Create runbooks for common issues
- [ ] Test alert firing and recovery
- [ ] Document alert thresholds

**Alert Examples:**
- High error rate (>5% in 5 minutes)
- Component timeout (>3 in 1 minute)
- Server down (no logs in 1 minute)
- Disk space low (<10%)

**Deliverables:**
- Alert rules configured
- Notification channels tested
- Runbooks created

### Phase 5: Production Deployment (Week 5)

**Goal:** Deploy to production

**Tasks:**
- [ ] Set up persistent storage for Loki
- [ ] Configure retention policies
- [ ] Set up backup strategy
- [ ] Configure authentication
- [ ] Set up SSL/TLS
- [ ] Performance tuning
- [ ] Load testing

**Deliverables:**
- Production-ready deployment
- Backup and restore procedures
- Performance benchmarks

---

## Configuration Files

### Directory Structure

```
LandingPage/
├── docker-compose.yml                    # Main application
├── docker-compose.observability.yml      # Observability stack
├── observability/
│   ├── loki/
│   │   ├── loki-config.yml
│   │   └── rules/
│   │       └── alerts.yml
│   ├── promtail/
│   │   └── promtail-config.yml
│   ├── grafana/
│   │   ├── datasources/
│   │   │   └── loki.yml
│   │   ├── dashboards/
│   │   │   ├── system-overview.json
│   │   │   ├── component-health.json
│   │   │   ├── user-activity.json
│   │   │   └── error-analysis.json
│   │   └── provisioning/
│   │       ├── datasources.yml
│   │       └── dashboards.yml
│   └── README.md
└── docs/
    └── observability/
        ├── grafana-loki-setup-plan.md    # This file
        ├── dashboard-guide.md
        ├── alert-runbooks.md
        └── troubleshooting.md
```

### docker-compose.observability.yml

```yaml
version: '3.8'

services:
  loki:
    image: grafana/loki:2.9.3
    container_name: loki
    ports:
      - "3100:3100"
    volumes:
      - ./observability/loki/loki-config.yml:/etc/loki/loki-config.yml
      - loki-data:/loki
    command: -config.file=/etc/loki/loki-config.yml
    networks:
      - observability

  promtail:
    image: grafana/promtail:2.9.3
    container_name: promtail
    volumes:
      - ./observability/promtail/promtail-config.yml:/etc/promtail/promtail-config.yml
      - /var/log:/var/log
      - /var/run/docker.sock:/var/run/docker.sock
    command: -config.file=/etc/promtail/promtail-config.yml
    depends_on:
      - loki
    networks:
      - observability

  grafana:
    image: grafana/grafana:10.2.3
    container_name: grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - ./observability/grafana/datasources:/etc/grafana/provisioning/datasources
      - ./observability/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - grafana-data:/var/lib/grafana
    depends_on:
      - loki
    networks:
      - observability
      - landingpage-network

networks:
  observability:
    driver: bridge
  landingpage-network:
    external: true

volumes:
  loki-data:
  grafana-data:
```

---

## Dashboard Design

### Dashboard 1: System Overview

**Purpose:** High-level health check

**Panels:**
1. **Request Rate** (Time series)
   - Total requests per minute
   - Breakdown by endpoint
2. **Error Rate** (Time series)
   - Errors per minute
   - Error percentage
3. **Response Time** (Time series)
   - P50, P95, P99 latency
4. **Active Components** (Stat)
   - Count of loaded components
5. **Recent Errors** (Logs)
   - Last 10 errors with stack traces

**LogQL Queries:**
```logql
# Request rate
rate({job="landingpage"} |= "request" [1m])

# Error rate
rate({job="landingpage", level="error"} [1m])

# Component count
count_over_time({job="landingpage"} |= "Component loaded" [5m])
```

### Dashboard 2: Component Health

**Purpose:** Monitor individual components

**Panels:**
1. **Component Load Time** (Bar chart)
   - Load time by component
2. **Component Errors** (Table)
   - Error count by component
3. **Component Timeouts** (Time series)
   - Timeout events over time
4. **Failed Components** (Stat)
   - Count of failed components

### Dashboard 3: User Activity

**Purpose:** Track user behavior

**Panels:**
1. **Page Views** (Time series)
   - Views per minute
2. **Component Interactions** (Heatmap)
   - Which components are used most
3. **User Sessions** (Stat)
   - Active sessions
4. **Navigation Flow** (Sankey diagram)
   - User journey through components

### Dashboard 4: Error Analysis

**Purpose:** Deep dive into errors

**Panels:**
1. **Error Breakdown** (Pie chart)
   - Errors by component
2. **Error Trends** (Time series)
   - Error rate over time
3. **Top Errors** (Table)
   - Most common error messages
4. **Error Logs** (Logs panel)
   - Full error details with context

---

## Deployment Strategy

### Development Environment

```bash
# Start observability stack
docker-compose -f docker-compose.observability.yml up -d

# Start application
docker-compose up -d

# Access Grafana
open http://localhost:3001
# Login: admin / admin
```

### Production Environment

**Requirements:**
- Persistent storage for Loki data
- SSL/TLS certificates
- Authentication (OAuth, LDAP, or basic auth)
- Backup strategy
- Monitoring of monitoring stack

**Deployment Steps:**
1. Provision infrastructure (VM or Kubernetes)
2. Set up persistent volumes
3. Configure SSL/TLS
4. Deploy Loki
5. Deploy Promtail
6. Deploy Grafana
7. Import dashboards
8. Configure alerts
9. Test end-to-end
10. Document access and procedures

---

## Testing & Validation

### Test Cases

1. **Log Collection**
   - [ ] Logs appear in Loki within 10 seconds
   - [ ] Labels are correctly applied
   - [ ] Log levels are parsed correctly

2. **Dashboard Functionality**
   - [ ] All panels load without errors
   - [ ] Queries return data
   - [ ] Time range selector works
   - [ ] Refresh works correctly

3. **Alerting**
   - [ ] Alerts fire when conditions met
   - [ ] Notifications are sent
   - [ ] Alerts resolve when conditions clear

4. **Performance**
   - [ ] Grafana loads in <2 seconds
   - [ ] Queries complete in <5 seconds
   - [ ] No memory leaks over 24 hours

### Validation Checklist

- [ ] All components logging correctly
- [ ] Dashboards showing real-time data
- [ ] Alerts configured and tested
- [ ] Documentation complete
- [ ] Team trained on usage
- [ ] Backup and restore tested

---

## Maintenance & Monitoring

### Regular Tasks

**Daily:**
- Check dashboard for anomalies
- Review critical alerts

**Weekly:**
- Review log retention
- Check disk usage
- Review alert effectiveness

**Monthly:**
- Update Grafana/Loki versions
- Review and optimize queries
- Archive old dashboards
- Update documentation

### Backup Strategy

**What to Backup:**
- Grafana dashboards (JSON exports)
- Grafana data source configurations
- Loki configuration files
- Alert rules

**Backup Schedule:**
- Daily: Grafana SQLite database
- Weekly: Dashboard JSON exports
- Monthly: Full configuration backup

**Restore Procedure:**
1. Stop Grafana
2. Restore database/configs
3. Start Grafana
4. Verify dashboards load
5. Test queries

---

## Next Steps

### Immediate Actions (This Week)

1. **Review this plan** with team
2. **Create observability directory** structure
3. **Set up docker-compose.observability.yml**
4. **Test local Grafana + Loki** deployment

### Questions to Answer

- [ ] What log retention period do we need? (Default: 7 days)
- [ ] Who should have access to Grafana? (Admin, developers, ops)
- [ ] What alert notification channels? (Email, Slack, PagerDuty)
- [ ] What are our SLAs? (Uptime, response time, error rate)
- [ ] Do we need multi-tenancy? (Separate logs by environment)

### Resources Needed

- **Infrastructure:** 
  - 2 CPU cores
  - 4GB RAM
  - 50GB disk (for 7 days retention)
- **Time:**
  - 1 week for setup
  - 2 weeks for dashboard development
  - 1 week for testing
- **Skills:**
  - Docker/Docker Compose
  - LogQL (Loki Query Language)
  - Grafana dashboard creation

---

## References

- [Grafana Documentation](https://grafana.com/docs/grafana/latest/)
- [Loki Documentation](https://grafana.com/docs/loki/latest/)
- [Promtail Documentation](https://grafana.com/docs/loki/latest/clients/promtail/)
- [LogQL Syntax](https://grafana.com/docs/loki/latest/logql/)
- [Grafana Dashboards](https://grafana.com/grafana/dashboards/)

---

**Status:** ✅ Plan Complete - Ready for Review  
**Next:** Create `docker-compose.observability.yml` and test local setup
