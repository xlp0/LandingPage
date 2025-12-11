# CLM Iframe Architecture

## 🎯 Overview

The **CLM Iframe Architecture** implements the Cubical Logic Model using iframe-based component isolation. This ensures that when one component fails, it does not crash the entire page - a critical requirement for resilient, scalable applications.

## 🔷 Core Principles

### 1. Failure Isolation
- Each component runs in its own iframe sandbox
- Component crashes are contained and don't affect other components
- Main page continues to function even if multiple components fail
- Error boundaries display clear failure messages

### 2. Hyperlink-Based Configuration
- **No hash-based content** (simplified from original CLM spec)
- Components reference URLs directly in YAML registry
- URLs point to self-contained HTML files
- Each component is a complete, standalone web page

### 3. YAML-Driven Registry
- Single source of truth: `clm-registry.yaml`
- Defines all components with their URLs and metadata
- Served via `/api/clm/registry` endpoint
- Dynamic component loading based on registry

### 4. Guaranteed Observability
- Every component sends heartbeat messages
- Telemetry collected via `/api/clm/telemetry` endpoint
- Real-time metrics displayed in observability sidecar
- Prometheus/Loki/Grafana integration ready

## 📐 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Main Page (index-clm.html)              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         CLM Iframe Loader (clm-iframe-loader.js)      │  │
│  └───────────────────────────────────────────────────────┘  │
│                            ↓                                 │
│              Fetches CLM Registry (YAML)                     │
│                            ↓                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Component 1   │  Component 2   │  Component 3        │  │
│  │  (iframe)      │  (iframe)      │  (iframe)           │  │
│  │  ┌──────────┐  │  ┌──────────┐  │  ┌──────────┐       │  │
│  │  │ welcome  │  │  │   auth   │  │  │   hero   │       │  │
│  │  │  .html   │  │  │  .html   │  │  │  .html   │       │  │
│  │  └──────────┘  │  └──────────┘  │  └──────────┘       │  │
│  │       ↓        │       ↓        │       ↓             │  │
│  │   Heartbeat    │   Heartbeat    │   Heartbeat         │  │
│  └───────────────────────────────────────────────────────┘  │
│                            ↓                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Observability Sidecar (Real-time Panel)       │  │
│  │  - Components Loaded: 5                               │  │
│  │  - Components Failed: 1                               │  │
│  │  - Heartbeats Received: 127                           │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
              ┌─────────────────────────────┐
              │   CLM YAML Server           │
              │   /api/clm/registry         │
              │   /api/clm/telemetry        │
              │   /api/clm/health/:id       │
              └─────────────────────────────┘
                            ↓
              ┌─────────────────────────────┐
              │   Observability Stack       │
              │   - Prometheus (Metrics)    │
              │   - Loki (Logs)             │
              │   - Grafana (Dashboards)    │
              └─────────────────────────────┘
```

## 📁 File Structure

```
LandingPage/
├── index-clm.html                    # Main page with CLM architecture
├── clm-registry.yaml                 # Component registry (YAML)
├── js/
│   └── clm-iframe-loader.js          # Iframe loader and orchestrator
├── components/                       # Standalone component HTML files
│   ├── welcome.html
│   ├── auth-status.html
│   ├── hero.html
│   ├── p2p-status.html
│   └── crash-test.html               # Intentionally fails
├── routes/
│   └── clm.js                        # CLM YAML server endpoints
└── docs/
    └── clm-iframe-architecture.md    # This file
```

## 🔧 CLM Registry Structure

```yaml
version: "2.0.0"
registry_url: "https://henry.pkc.pub/clm"

components:
  - id: "welcome"
    name: "Welcome Component"
    url: "https://henry.pkc.pub/components/welcome.html"
    abstract:
      context: "Entry point for user interaction"
      goal: "Greet user and set narrative tone"
    concrete:
      implementation: "https://henry.pkc.pub/components/welcome.html"
      sandbox: "allow-scripts allow-same-origin"
    balanced:
      metrics_endpoint: "/metrics/welcome"
      health_check: "/health/welcome"
      expected_load_time_ms: 500
```

### Key Fields

| Field | Purpose | Example |
|-------|---------|---------|
| `id` | Unique component identifier | `"welcome"` |
| `url` | Component URL (hyperlink, not hash) | `"https://henry.pkc.pub/components/welcome.html"` |
| `abstract.context` | What problem does this solve? | `"Entry point for user interaction"` |
| `abstract.goal` | What is the intended outcome? | `"Greet user and set narrative tone"` |
| `concrete.implementation` | URL to executable code | Same as `url` |
| `concrete.sandbox` | Iframe sandbox permissions | `"allow-scripts allow-same-origin"` |
| `balanced.expected_load_time_ms` | Performance SLA | `500` |
| `balanced.expected_failure` | Is failure expected? | `true` (for crash-test) |

## 🚀 How It Works

### 1. Initialization

```javascript
const clmLoader = new CLMIframeLoader();
await clmLoader.init(); // Fetches clm-registry.yaml
```

### 2. Component Loading

```javascript
await clmLoader.loadComponent('welcome', containerElement, {
  height: '200px',
  width: '100%'
});
```

### 3. Failure Handling

When a component fails:
1. Error is caught by iframe error boundary
2. Error message displayed in component slot
3. Other components continue to function
4. Telemetry sent to `/api/clm/telemetry`
5. Observability panel updated

### 4. Health Monitoring

Each component sends heartbeat every 3 seconds:

```javascript
// Inside component iframe
setInterval(() => {
  window.parent.postMessage({
    type: 'clm_heartbeat',
    componentId: 'welcome',
    timestamp: Date.now()
  }, '*');
}, 3000);
```

Main page tracks heartbeats and detects crashes.

## 📊 Observability Integration

### Telemetry Endpoint

```javascript
POST /api/clm/telemetry
{
  "component_id": "welcome",
  "event_type": "load_success",
  "data": {
    "load_time_ms": 234,
    "expected_time_ms": 500
  },
  "timestamp": "2025-11-27T16:00:00Z"
}
```

### Metrics Collected

- **Component Load Time**: How long each component takes to load
- **Load Success/Failure**: Binary success indicator
- **Heartbeat Count**: Number of heartbeats received
- **Health Check Failures**: Components that stopped responding

### Prometheus Integration (Future)

```yaml
# Metrics auto-generated from CLM YAML
- name: clm_component_load_duration_seconds
  type: histogram
  labels: [component_id]

- name: clm_component_load_failures_total
  type: counter
  labels: [component_id, error_type]

- name: clm_component_heartbeats_total
  type: counter
  labels: [component_id]
```

## 🎨 Component Development

### Creating a New Component

1. **Create HTML file** in `components/` directory:

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Component</title>
  <style>/* Component styles */</style>
</head>
<body>
  <div>My Component Content</div>
  
  <script>
    // Send heartbeat
    setInterval(() => {
      window.parent.postMessage({
        type: 'clm_heartbeat',
        componentId: 'my-component',
        timestamp: Date.now()
      }, '*');
    }, 3000);
  </script>
</body>
</html>
```

2. **Add to CLM registry** (`clm-registry.yaml`):

```yaml
components:
  - id: "my-component"
    name: "My Component"
    url: "https://henry.pkc.pub/components/my-component.html"
    abstract:
      context: "Component purpose"
      goal: "Component goal"
    concrete:
      implementation: "https://henry.pkc.pub/components/my-component.html"
      sandbox: "allow-scripts allow-same-origin"
    balanced:
      expected_load_time_ms: 300
```

3. **Load in main page**:

```javascript
await clmLoader.loadComponent('my-component', containerElement);
```

## 🔒 Security Considerations

### Iframe Sandbox

Each component runs with restricted permissions:

```
sandbox="allow-scripts allow-same-origin"
```

Additional permissions can be granted:
- `allow-popups` - For OAuth flows
- `allow-forms` - For form submissions
- `allow-modals` - For alert/confirm dialogs

### Content Security Policy

Components should define CSP headers:

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self' 'unsafe-inline'">
```

## 🧪 Testing Failure Isolation

The `crash-test` component intentionally fails to demonstrate isolation:

```javascript
// Automatically crashes after 3 seconds
setTimeout(() => {
  throw new Error('Intentional error for testing!');
}, 3000);
```

**Expected Behavior:**
- Crash test component shows error boundary
- Other components continue to function
- Observability panel shows 1 failed component
- Main page remains interactive

## 📈 Benefits

### 1. Resilience
- Component failures don't cascade
- Graceful degradation
- Clear error messages

### 2. Scalability
- Components can be developed independently
- Easy to add/remove components
- No tight coupling between components

### 3. Observability
- Real-time monitoring of all components
- Immediate failure detection
- Performance tracking

### 4. Simplicity
- No complex build process
- No hash-based content resolution
- Direct URL references
- Self-contained components

## 🔮 Future Enhancements

1. **Dynamic Component Loading**: Load components on-demand based on user actions
2. **Component Versioning**: Support multiple versions of same component
3. **A/B Testing**: Load different component variants based on user segment
4. **Lazy Loading**: Defer loading of below-the-fold components
5. **Service Worker**: Cache components for offline functionality

## 🎓 Comparison to Original CLM

| Aspect | Original CLM | Iframe CLM |
|--------|--------------|------------|
| Content Reference | Hash-based (sha256) | URL-based (hyperlinks) |
| Content Storage | MCard collection | Static HTML files |
| Failure Isolation | Not guaranteed | Guaranteed (iframe sandbox) |
| Complexity | High (hash resolution) | Low (direct URLs) |
| Observability | Specified | Implemented |
| Verification | Cryptographic | HTTP-based |

## 📚 Related Documentation

- [CLM Implementation Guide](./clm-implementation-guide.md) - Original hash-based CLM
- [Cubical HTML Architecture](./cubical-html-architecture.md) - Core concepts
- [Component Documentation](./components/) - Individual component specs

## 🤝 Contributing

To add a new component:
1. Create HTML file in `components/`
2. Add entry to `clm-registry.yaml`
3. Update `index-clm.html` to include container
4. Test failure isolation
5. Document in `docs/components/`

---

**Version**: 2.0.0  
**Last Updated**: 2025-11-27  
**Status**: Production Ready ✅
