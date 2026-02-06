# Grafana Metrics Pipeline - Workflow Diagram

## Complete Pipeline Flow

```mermaid
graph TD
    A[GitHub Actions Trigger] -->|Daily 06:00 WITA| B[Checkout Repository]
    A -->|Manual Trigger| B
    
    B --> C[Setup Python 3.11]
    C --> D[Install Dependencies]
    D --> E[Create Metrics Directory]
    
    E --> F[Collect Grafana Metrics]
    F -->|collect_grafana_metrics.py| G{Metrics Collected?}
    
    G -->|Yes| H[JSON Files Created]
    G -->|No| Z[Workflow Failed]
    
    H --> I[Generate ZITADEL Report]
    I -->|generate_zitadel_report.py| J[ZITADEL MD Created]
    
    J --> K[Convert All Metrics to MD]
    K -->|convert_metrics_to_markdown.py| L[Kubernetes MD Files]
    
    L --> M[Upload to MinIO]
    M -->|upload_metrics_to_minio.py| N{Upload Success?}
    
    N -->|Yes| O[Files in MinIO]
    N -->|No| P[Upload Failed]
    
    O --> Q[Upload GitHub Artifacts]
    Q --> R[Workflow Complete]
    
    style A fill:#e1f5ff
    style F fill:#fff4e1
    style I fill:#fff4e1
    style K fill:#fff4e1
    style M fill:#e8f5e9
    style O fill:#e8f5e9
    style R fill:#e8f5e9
    style Z fill:#ffebee
    style P fill:#ffebee
```

## Data Flow

```mermaid
graph LR
    A[Grafana Dashboards] -->|API Query| B[Prometheus Metrics]
    B -->|JSON Response| C[collect_grafana_metrics.py]
    
    C -->|Save| D[JSON Files]
    
    D -->|ZITADEL| E[generate_zitadel_report.py]
    D -->|Kubernetes| F[convert_metrics_to_markdown.py]
    
    E -->|Generate| G[ZITADEL MD]
    F -->|Generate| H[Kubernetes MD Files]
    
    D --> I[upload_metrics_to_minio.py]
    G --> I
    H --> I
    
    I -->|Upload| J[MinIO Storage]
    
    J --> K[minio.pkc.pub/pkc/grafana-metrics/YYYY-MM-DD/]
    
    style A fill:#e3f2fd
    style B fill:#e3f2fd
    style C fill:#fff9c4
    style E fill:#fff9c4
    style F fill:#fff9c4
    style I fill:#fff9c4
    style J fill:#c8e6c9
    style K fill:#c8e6c9
```

## File Transformation Flow

```mermaid
graph TD
    A[Grafana API] -->|Collect| B[kubernetes___api_server_20260206_061711.json]
    A -->|Collect| C[kubernetes___compute_resources___cluster_20260206_061800.json]
    A -->|Collect| D[zitadel_authentication_&_user_monitoring_20260206_062204.json]
    
    B -->|Convert| E[kubernetes___api_server_20260206_061711.md]
    C -->|Convert| F[kubernetes___compute_resources___cluster_20260206_061800.md]
    D -->|Convert| G[zitadel_authentication_&_user_monitoring_20260206_062204.md]
    
    B -->|Upload| H[MinIO: JSON Files]
    C -->|Upload| H
    D -->|Upload| H
    
    E -->|Upload| I[MinIO: MD Files]
    F -->|Upload| I
    G -->|Upload| I
    
    H --> J[Browse/Download JSON]
    I --> K[Browse/Download Markdown]
    
    style A fill:#bbdefb
    style B fill:#fff9c4
    style C fill:#fff9c4
    style D fill:#fff9c4
    style E fill:#c5e1a5
    style F fill:#c5e1a5
    style G fill:#c5e1a5
    style H fill:#b2dfdb
    style I fill:#b2dfdb
```

## Script Execution Sequence

```mermaid
sequenceDiagram
    participant GHA as GitHub Actions
    participant CGM as collect_grafana_metrics.py
    participant GRF as Grafana API
    participant GZR as generate_zitadel_report.py
    participant CMM as convert_metrics_to_markdown.py
    participant UMM as upload_metrics_to_minio.py
    participant MinIO as MinIO Storage
    
    GHA->>CGM: Execute collection
    CGM->>GRF: Authenticate
    GRF-->>CGM: Session token
    
    loop For each dashboard
        CGM->>GRF: Query metrics
        GRF-->>CGM: Prometheus data
        CGM->>CGM: Save JSON file
    end
    
    CGM-->>GHA: Collection complete
    
    GHA->>GZR: Generate ZITADEL report
    GZR->>GZR: Load ZITADEL JSON
    GZR->>GZR: Parse metrics
    GZR->>GZR: Apply template
    GZR-->>GHA: ZITADEL MD created
    
    GHA->>CMM: Convert all metrics
    
    loop For each JSON file
        CMM->>CMM: Load JSON
        CMM->>CMM: Format metrics
        CMM->>CMM: Generate MD
    end
    
    CMM-->>GHA: Conversion complete
    
    GHA->>UMM: Upload to MinIO
    UMM->>MinIO: Connect
    
    loop For each file (JSON + MD)
        UMM->>MinIO: Upload file
        MinIO-->>UMM: Upload success
    end
    
    UMM-->>GHA: Upload complete
    GHA->>GHA: Upload artifacts
```

## Directory Structure

```
LandingPage/
├── .github/
│   ├── workflows/
│   │   └── grafana-metrics-collector.yml    ← Main workflow
│   └── scripts/
│       ├── collect_grafana_metrics.py       ← Step 1: Collect
│       ├── convert_metrics_to_markdown.py   ← Step 3: Convert
│       ├── upload_metrics_to_minio.py       ← Step 4: Upload
│       └── README.md                        ← Scripts documentation
│
├── daily-reports/
│   ├── generate_zitadel_report.py           ← Step 2: ZITADEL report
│   └── zitadel_report_template.md           ← ZITADEL template
│
├── docs/09-performance/observability/
│   ├── GRAFANA-METRICS-PIPELINE.md          ← Complete pipeline docs
│   ├── METRICS-CONVERSION-GUIDE.md          ← Conversion guide
│   ├── PIPELINE-WORKFLOW-DIAGRAM.md         ← This file
│   └── GRAFANA-DASHBOARD-OBSERVABILITY.md   ← Dashboard setup
│
└── grafana-metrics/                         ← Output directory
    ├── *.json                               ← Raw metrics
    ├── *.md                                 ← Markdown reports
    ├── latest_summary.json                  ← Collection summary
    └── upload_results.json                  ← Upload status
```

## MinIO Storage Structure

```
minio.pkc.pub/
└── pkc/                                     ← Bucket
    └── grafana-metrics/                     ← Base path
        ├── 2026-02-05/                      ← Date folder
        │   ├── *.json
        │   └── *.md
        ├── 2026-02-06/                      ← Today's metrics
        │   ├── kubernetes___api_server_20260206_061711.json
        │   ├── kubernetes___api_server_20260206_061711.md
        │   ├── kubernetes___compute_resources___cluster_20260206_061800.json
        │   ├── kubernetes___compute_resources___cluster_20260206_061800.md
        │   ├── zitadel_authentication_&_user_monitoring_20260206_062204.json
        │   ├── zitadel_authentication_&_user_monitoring_20260206_062204.md
        │   └── latest_summary.json
        └── 2026-02-07/                      ← Future metrics
            └── ...
```

## Metric Types and Handlers

```mermaid
graph TD
    A[Collected Metrics] --> B{Metric Type}
    
    B -->|ZITADEL| C[generate_zitadel_report.py]
    B -->|Kubernetes API| D[convert_metrics_to_markdown.py]
    B -->|Compute Resources| D
    B -->|Networking| D
    B -->|Kubelet| D
    B -->|Scheduler| D
    B -->|Persistent Volumes| D
    
    C --> E[Custom ZITADEL Template]
    D --> F[Generic Kubernetes Template]
    
    E --> G[ZITADEL MD Report]
    F --> H[Kubernetes MD Reports]
    
    G --> I[MinIO Upload]
    H --> I
    
    style C fill:#ffecb3
    style D fill:#ffecb3
    style E fill:#c5cae9
    style F fill:#c5cae9
    style I fill:#a5d6a7
```

## Time Zones

```
UTC Time:     22:00 (Previous day)
              ↓
WITA Time:    06:00 (Current day) ← Workflow trigger
              ↓
Collection:   06:00 - 06:22
              ↓
Upload:       06:22
              ↓
Available:    06:22+ (MinIO)
```

## Access Patterns

```mermaid
graph LR
    A[User] -->|Option 1| B[MinIO Browser UI]
    A -->|Option 2| C[Direct URL]
    A -->|Option 3| D[GitHub Artifacts]
    A -->|Option 4| E[MinIO CLI mc]
    
    B --> F[Browse by Date]
    C --> G[Download Specific File]
    D --> H[Download ZIP Archive]
    E --> I[Sync/Mirror Files]
    
    F --> J[View/Download MD]
    G --> J
    H --> J
    I --> J
    
    style A fill:#e1bee7
    style J fill:#c5e1a5
```

---

*Diagrams use Mermaid syntax - viewable in GitHub, VS Code, and most Markdown renderers*
