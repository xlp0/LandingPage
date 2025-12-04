# ArgoCD Deployment Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          GitHub Repository                          │
│                  https://github.com/xlp0/LandingPage                │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                    k8s/ Directory                           │   │
│  │                                                              │   │
│  │  • deployment-dev-with-configmap.yaml                       │   │
│  │  • configmap-dev.yaml                                       │   │
│  │  • service.yaml                                             │   │
│  │  • ingress.yaml                                             │   │
│  │  • kustomization.yaml                                       │   │
│  └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Git Pull (every 3 minutes)
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          ArgoCD Server                               │
│                      https://argocd.pkc.pub                          │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │              ArgoCD Application                             │   │
│  │              "thkmesh-landingpage"                          │   │
│  │                                                              │   │
│  │  • Monitors: github.com/xlp0/LandingPage/k8s               │   │
│  │  • Auto-Sync: Enabled                                       │   │
│  │  • Self-Heal: Enabled                                       │   │
│  │  • Auto-Prune: Enabled                                      │   │
│  └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Apply Manifests
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Kubernetes Cluster                              │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                    Namespace: default                       │   │
│  │                                                              │   │
│  │  ┌──────────────────────────────────────────────────────┐ │   │
│  │  │              ConfigMap                                │ │   │
│  │  │        landingpage-dev-config                         │ │   │
│  │  │                                                        │ │   │
│  │  │  • WEBSOCKET_URL: wss://dev.pkc.pub/ws/              │ │   │
│  │  │  • ZITADEL_CLIENT_ID: 348373619962871815             │ │   │
│  │  │  • NODE_ENV: production                               │ │   │
│  │  │  • PORT: 3000                                         │ │   │
│  │  └──────────────────────────────────────────────────────┘ │   │
│  │                                                              │   │
│  │  ┌──────────────────────────────────────────────────────┐ │   │
│  │  │              Deployment                               │ │   │
│  │  │           landingpage-dev                             │ │   │
│  │  │                                                        │ │   │
│  │  │  ┌──────────────────────────────────────────────┐   │ │   │
│  │  │  │           Pod                                 │   │ │   │
│  │  │  │                                                │   │ │   │
│  │  │  │  Container: landingpage                       │   │ │   │
│  │  │  │  Image: henry768/landingpage:latest_landingpage│   │ │   │
│  │  │  │  Port: 3000                                    │   │ │   │
│  │  │  │  Env: From ConfigMap                           │   │ │   │
│  │  │  │                                                │   │ │   │
│  │  │  │  Health Checks:                                │   │ │   │
│  │  │  │    Liveness: /health (every 30s)              │   │ │   │
│  │  │  │    Readiness: /health (every 10s)             │   │ │   │
│  │  │  └──────────────────────────────────────────────┘   │ │   │
│  │  └──────────────────────────────────────────────────────┘ │   │
│  │                                                              │   │
│  │  ┌──────────────────────────────────────────────────────┐ │   │
│  │  │              Service                                  │ │   │
│  │  │          landingpage-dev                              │ │   │
│  │  │                                                        │ │   │
│  │  │  Type: ClusterIP                                      │ │   │
│  │  │  Port: 80 → 3000                                      │ │   │
│  │  │  Port: 443 → 3000                                     │ │   │
│  │  └──────────────────────────────────────────────────────┘ │   │
│  │                                                              │   │
│  │  ┌──────────────────────────────────────────────────────┐ │   │
│  │  │              Ingress                                  │ │   │
│  │  │       landingpage-dev-ingress                         │ │   │
│  │  │                                                        │ │   │
│  │  │  Host: dev.pkc.pub                                    │ │   │
│  │  │  Path: / → landingpage-dev:80                         │ │   │
│  │  │  WebSocket: Enabled                                   │ │   │
│  │  │  CORS: Enabled                                        │ │   │
│  │  └──────────────────────────────────────────────────────┘ │   │
│  └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS/WSS
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          External Users                              │
│                                                                      │
│  • Web Browser: https://dev.pkc.pub                                 │
│  • WebSocket: wss://dev.pkc.pub/ws/                                 │
│  • Health Check: https://dev.pkc.pub/health                         │
└─────────────────────────────────────────────────────────────────────┘
```

## GitOps Workflow

```
┌──────────────┐
│  Developer   │
└──────┬───────┘
       │
       │ 1. Edit k8s/*.yaml
       │ 2. git commit
       │ 3. git push
       ▼
┌──────────────┐
│    GitHub    │
└──────┬───────┘
       │
       │ Webhook (optional)
       │ or Poll (every 3 min)
       ▼
┌──────────────┐
│   ArgoCD     │◄──────── 4. Detect changes
└──────┬───────┘
       │
       │ 5. Compare desired vs actual state
       │ 6. Auto-sync (if enabled)
       ▼
┌──────────────┐
│  Kubernetes  │◄──────── 7. Apply manifests
└──────┬───────┘
       │
       │ 8. Deploy pods
       │ 9. Update services
       ▼
┌──────────────┐
│  Application │◄──────── 10. Serve traffic
│   Running    │
└──────────────┘
```

## Sync Behavior

### Automated Sync (Default)

```
Git Change → ArgoCD Detects → Auto Sync → Kubernetes Updated
    ↓              ↓               ↓              ↓
  Commit      (3 min poll)    Apply YAML    Pods restart
```

### Self-Heal

```
Manual kubectl edit → Drift detected → Auto-revert → Back to Git state
         ↓                  ↓                ↓              ↓
    Change pod         ArgoCD sees      Reapply YAML    Git wins
```

### Auto-Prune

```
Delete from Git → ArgoCD detects → Delete from K8s → Resource removed
       ↓                ↓                  ↓                ↓
  Remove YAML      Sync cycle        kubectl delete    Cleaned up
```

## Resource Dependencies

```
┌─────────────────┐
│   ConfigMap     │
└────────┬────────┘
         │
         │ Referenced by
         ▼
┌─────────────────┐
│   Deployment    │
└────────┬────────┘
         │
         │ Creates
         ▼
┌─────────────────┐
│      Pods       │
└────────┬────────┘
         │
         │ Selected by
         ▼
┌─────────────────┐
│    Service      │
└────────┬────────┘
         │
         │ Backend for
         ▼
┌─────────────────┐
│    Ingress      │
└─────────────────┘
```

## Multi-Environment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Repository                         │
│                                                               │
│  k8s/                                                         │
│  ├── configmap-dev.yaml                                      │
│  ├── configmap-prod.yaml                                     │
│  ├── deployment-dev-with-configmap.yaml                      │
│  └── ...                                                      │
└─────────────────────────────────────────────────────────────┘
                           │
                           │
        ┌──────────────────┴──────────────────┐
        │                                      │
        ▼                                      ▼
┌──────────────────┐                  ┌──────────────────┐
│  ArgoCD App Dev  │                  │ ArgoCD App Prod  │
│                  │                  │                  │
│  • Auto-sync: ✅ │                  │  • Auto-sync: ❌ │
│  • Self-heal: ✅ │                  │  • Self-heal: ❌ │
│  • Namespace:    │                  │  • Namespace:    │
│    default       │                  │    production    │
└────────┬─────────┘                  └────────┬─────────┘
         │                                      │
         ▼                                      ▼
┌──────────────────┐                  ┌──────────────────┐
│   Dev Cluster    │                  │  Prod Cluster    │
│                  │                  │                  │
│  dev.pkc.pub     │                  │  pkc.pub         │
└──────────────────┘                  └──────────────────┘
```

## Health Check Flow

```
┌─────────────────┐
│   Kubernetes    │
│   Liveness      │
│     Probe       │
└────────┬────────┘
         │
         │ GET /health every 30s
         ▼
┌─────────────────┐
│   Application   │
│   Container     │
│   Port 3000     │
└────────┬────────┘
         │
         │ Returns JSON
         ▼
┌─────────────────┐
│  Health Status  │
│                 │
│  {              │
│    status: "ok",│
│    uptime: 3600,│
│    ...          │
│  }              │
└─────────────────┘
         │
         │ If fails 3 times
         ▼
┌─────────────────┐
│  Pod Restart    │
└─────────────────┘
```

## Network Flow

```
Internet
   │
   │ HTTPS/WSS
   ▼
┌─────────────────┐
│  Ingress        │
│  Controller     │
│  (Nginx)        │
└────────┬────────┘
         │
         │ Route by host: dev.pkc.pub
         ▼
┌─────────────────┐
│  Service        │
│  landingpage-   │
│  dev            │
│  (ClusterIP)    │
└────────┬────────┘
         │
         │ Load balance
         ▼
┌─────────────────┐
│  Pod(s)         │
│  Port 3000      │
│                 │
│  ┌───────────┐ │
│  │ Container │ │
│  │ Landing   │ │
│  │ Page      │ │
│  └───────────┘ │
└─────────────────┘
```

## Configuration Management

```
┌─────────────────────────────────────────────┐
│         Git Repository (Source)              │
│                                               │
│  k8s/configmap-dev.yaml                      │
│  ┌─────────────────────────────────────┐   │
│  │ data:                                │   │
│  │   WEBSOCKET_URL: wss://dev.pkc.pub  │   │
│  │   ZITADEL_CLIENT_ID: 348373...      │   │
│  │   NODE_ENV: production               │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
                    │
                    │ ArgoCD Sync
                    ▼
┌─────────────────────────────────────────────┐
│         Kubernetes ConfigMap                 │
│                                               │
│  Name: landingpage-dev-config                │
│  Namespace: default                          │
└─────────────────────────────────────────────┘
                    │
                    │ envFrom
                    ▼
┌─────────────────────────────────────────────┐
│         Container Environment                │
│                                               │
│  process.env.WEBSOCKET_URL                   │
│  process.env.ZITADEL_CLIENT_ID              │
│  process.env.NODE_ENV                        │
└─────────────────────────────────────────────┘
```

## Deployment Strategies

### Rolling Update (Default)

```
┌─────────┐  ┌─────────┐  ┌─────────┐
│ Pod v1  │  │ Pod v1  │  │ Pod v1  │
└─────────┘  └─────────┘  └─────────┘
     │            │            │
     │            │            │ Create new pod
     │            │            ▼
     │            │       ┌─────────┐
     │            │       │ Pod v2  │
     │            │       └─────────┘
     │            │            │
     │            │            │ Wait for ready
     │            │            │
     │            │ Terminate  │
     │            ▼            │
     │       ┌─────────┐      │
     │       │ Pod v2  │      │
     │       └─────────┘      │
     │            │            │
     │ Terminate  │            │
     ▼            │            │
┌─────────┐      │            │
│ Pod v2  │      │            │
└─────────┘      │            │
     │            │            │
     ▼            ▼            ▼
All v2 pods running
```

## Monitoring & Observability

```
┌─────────────────┐
│   ArgoCD UI     │
│                 │
│  • Sync Status  │
│  • Resource     │
│    Tree         │
│  • Events       │
│  • Logs         │
└────────┬────────┘
         │
         │ Monitors
         ▼
┌─────────────────┐
│  Application    │
│  Resources      │
│                 │
│  • Deployment   │
│  • Pods         │
│  • Service      │
│  • Ingress      │
└────────┬────────┘
         │
         │ Health Checks
         ▼
┌─────────────────┐
│  /health        │
│  Endpoint       │
│                 │
│  Returns:       │
│  • Status       │
│  • Uptime       │
│  • Version      │
│  • Connections  │
└─────────────────┘
```

## Security Architecture

```
┌─────────────────────────────────────────────┐
│              Secrets Management              │
│                                               │
│  ┌─────────────┐      ┌─────────────┐      │
│  │  ConfigMap  │      │   Secret    │      │
│  │             │      │             │      │
│  │ Non-sensitive│     │  Sensitive  │      │
│  │ • URLs      │      │  • Passwords│      │
│  │ • Ports     │      │  • API Keys │      │
│  │ • Flags     │      │  • Tokens   │      │
│  └─────────────┘      └─────────────┘      │
│         │                     │              │
│         └──────────┬──────────┘              │
│                    │                         │
│                    ▼                         │
│            ┌─────────────┐                  │
│            │  Container  │                  │
│            │ Environment │                  │
│            └─────────────┘                  │
└─────────────────────────────────────────────┘
```

## Rollback Strategy

```
┌─────────────────┐
│  Current State  │
│    (v2.0)       │
└────────┬────────┘
         │
         │ Issue detected
         ▼
┌─────────────────┐
│  ArgoCD UI      │
│  History Tab    │
└────────┬────────┘
         │
         │ Select v1.0
         ▼
┌─────────────────┐
│  Rollback       │
│  Initiated      │
└────────┬────────┘
         │
         │ Apply old manifests
         ▼
┌─────────────────┐
│  Previous State │
│    (v1.0)       │
└─────────────────┘
```

## Summary

This architecture provides:

✅ **GitOps** - Git as single source of truth  
✅ **Automation** - Auto-sync, self-heal, auto-prune  
✅ **Observability** - Health checks, monitoring, logs  
✅ **Scalability** - Easy to add environments  
✅ **Security** - Secrets management, RBAC  
✅ **Reliability** - Rolling updates, rollback capability  
✅ **Simplicity** - Declarative configuration  

All managed through ArgoCD with Kubernetes best practices.
