# CLM Iframe Architecture - Quick Start Guide

## 🚀 What is This?

A **radically simplified** implementation of the Cubical Logic Model (CLM) using:
- **Hyperlinks** instead of hashes (no complex content resolution)
- **Iframe isolation** for component failure containment
- **YAML-driven** component registry
- **Guaranteed observability** with real-time telemetry

## 🎯 Key Innovation

**When one component crashes, the rest of the page continues to work.**

This is demonstrated by the `crash-test` component which intentionally fails after 3 seconds, but doesn't affect other components.

## 📁 Files Created

```
LandingPage/
├── index-clm.html                 # NEW: Main page with iframe architecture
├── clm-registry.yaml              # NEW: Component registry (YAML)
├── js/
│   └── clm-iframe-loader.js       # NEW: Iframe loader
├── components/                    # NEW: Standalone components
│   ├── welcome.html
│   ├── auth-status.html
│   ├── hero.html
│   ├── p2p-status.html
│   └── crash-test.html            # Intentionally fails!
├── routes/
│   └── clm.js                     # NEW: CLM YAML server
└── docs/
    ├── clm-iframe-architecture.md # NEW: Full documentation
    └── CLM-QUICKSTART.md          # This file
```

## 🏃 Quick Start

### 1. Install Dependencies

```bash
npm install
```

This will install `js-yaml` which is needed for the CLM YAML server.

### 2. Start the Server

```bash
npm run ws-server
```

### 3. Open the CLM Page

Navigate to:
```
http://localhost:8765/index-clm.html
```

### 4. Watch the Magic

You'll see:
- ✅ 5 components load in isolated iframes
- ✅ Real-time observability panel (bottom right)
- ✅ Crash test component fails after 3 seconds
- ✅ Other components continue to work normally
- ✅ Error boundary shows clear failure message

## 🔍 What to Look For

### Observability Panel (Bottom Right)

```
📊 Observability Sidecar
Components Loaded: 5
Components Failed: 1
Total Load Time: 1234ms
Heartbeats Received: 42
```

### Console Output

```
[CLM] Registry loaded
[Welcome Component] Loaded successfully
[Auth Status Component] Loaded successfully
[Hero Component] Loaded successfully
[P2P Status Component] Loaded successfully
[Crash Test Component] Loaded - Ready to fail!
[Crash Test] Auto-crashing in 3 seconds...
[CLM] Component 'crash-test' may have crashed (no heartbeat)
```

### Visual Indicators

- **Green status indicator**: Component healthy
- **Red error boundary**: Component failed
- **Heartbeat counter**: Increases every 3 seconds

## 🧪 Testing Failure Isolation

The `crash-test` component has 4 buttons to trigger different types of failures:

1. **Infinite Loop** - Freezes the iframe (not the page)
2. **Throw Error** - JavaScript error
3. **Access Undefined** - Null pointer error
4. **Memory Leak** - Gradual memory consumption

**Click any button** and observe:
- ❌ Crash test component shows error
- ✅ Other components still work
- ✅ Main page remains interactive
- ✅ Observability panel updates

## 📊 API Endpoints

### Get Component Registry

```bash
curl http://localhost:8765/api/clm/registry
```

Response:
```json
{
  "success": true,
  "registry": {
    "version": "2.0.0",
    "components": [...]
  }
}
```

### Get Single Component

```bash
curl http://localhost:8765/api/clm/component/welcome
```

### Health Check

```bash
curl http://localhost:8765/api/clm/health/welcome
```

### Send Telemetry

```bash
curl -X POST http://localhost:8765/api/clm/telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "component_id": "welcome",
    "event_type": "custom_event",
    "data": {"foo": "bar"}
  }'
```

## 🎨 Adding a New Component

### Step 1: Create HTML File

Create `components/my-component.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Component</title>
  <style>
    body { padding: 20px; background: #3498db; color: white; }
  </style>
</head>
<body>
  <h2>My Custom Component</h2>
  <p>This is my component content.</p>
  
  <script>
    // Send heartbeat every 3 seconds
    setInterval(() => {
      window.parent.postMessage({
        type: 'clm_heartbeat',
        componentId: 'my-component',
        timestamp: Date.now()
      }, '*');
    }, 3000);
    
    console.log('[My Component] Loaded!');
  </script>
</body>
</html>
```

### Step 2: Add to Registry

Edit `clm-registry.yaml`:

```yaml
components:
  # ... existing components ...
  
  - id: "my-component"
    name: "My Custom Component"
    url: "https://henry.pkc.pub/components/my-component.html"
    abstract:
      context: "Custom functionality"
      goal: "Demonstrate extensibility"
    concrete:
      implementation: "https://henry.pkc.pub/components/my-component.html"
      sandbox: "allow-scripts allow-same-origin"
    balanced:
      metrics_endpoint: "/metrics/my-component"
      health_check: "/health/my-component"
      expected_load_time_ms: 300
```

### Step 3: Add to Main Page

Edit `index-clm.html`:

```html
<!-- Add container -->
<div class="component-slot">
  <div class="component-label">Component: my-component</div>
  <div id="my-component-container"></div>
</div>
```

```javascript
// Add to container map
const containerMap = {
  // ... existing components ...
  'my-component': document.getElementById('my-component-container')
};
```

### Step 4: Reload and Test

```bash
# Restart server
npm run ws-server

# Open browser
http://localhost:8765/index-clm.html
```

## 🔧 Configuration

### Change Component URLs

Edit `clm-registry.yaml` to point to different URLs:

```yaml
- id: "welcome"
  url: "https://example.com/my-welcome-component.html"
```

### Adjust Iframe Sandbox

```yaml
concrete:
  sandbox: "allow-scripts allow-same-origin allow-popups"
```

Available permissions:
- `allow-scripts` - JavaScript execution
- `allow-same-origin` - Access to parent origin
- `allow-popups` - Open popups (for OAuth)
- `allow-forms` - Form submission
- `allow-modals` - alert/confirm dialogs

### Set Performance SLAs

```yaml
balanced:
  expected_load_time_ms: 500  # Warn if exceeds 500ms
  expected_failure: false     # Set to true for crash-test
```

## 📈 Observability

### Prometheus Metrics (Future)

The architecture is ready for Prometheus integration:

```yaml
# clm-registry.yaml
observability:
  prometheus:
    endpoint: "/metrics"
    scrape_interval: "15s"
```

### Loki Logs (Future)

```yaml
observability:
  loki:
    endpoint: "/loki/api/v1/push"
    labels:
      app: "pkc-landing"
      environment: "production"
```

### Grafana Dashboard (Future)

```yaml
observability:
  grafana:
    dashboard_url: "https://henry.pkc.pub/grafana/d/clm-overview"
```

## 🆚 Comparison to Original Architecture

| Feature | Original (index.html) | CLM Iframe (index-clm.html) |
|---------|----------------------|----------------------------|
| Component Isolation | ❌ No | ✅ Yes (iframe sandbox) |
| Failure Containment | ❌ Crashes cascade | ✅ Isolated failures |
| Configuration | 🔧 Hardcoded | 📄 YAML-driven |
| Observability | ⚠️ Manual | ✅ Automatic |
| Component Loading | 🔗 Direct imports | 🌐 URL-based |
| Development | 🔄 Coupled | 🎯 Independent |

## 🎓 Key Concepts

### 1. Cubical Logic Model (CLM)

Every component has 3 dimensions:
- **Abstract** (Trader): What and Why
- **Concrete** (Coder): How (implementation)
- **Balanced** (Miner): Verification (observability)

### 2. Iframe Isolation

Each component runs in a sandboxed iframe:
- Separate JavaScript context
- Separate DOM
- Crashes don't propagate
- Security boundaries enforced

### 3. Heartbeat Monitoring

Components send heartbeat every 3 seconds:
```javascript
window.parent.postMessage({
  type: 'clm_heartbeat',
  componentId: 'my-component',
  timestamp: Date.now()
}, '*');
```

Main page detects missing heartbeats → component crashed.

### 4. YAML Registry

Single source of truth for all components:
- Component URLs
- Metadata (name, description)
- Performance SLAs
- Observability config

## 🐛 Troubleshooting

### Components Not Loading

**Check console for errors:**
```
[CLM] Failed to load CLM registry
```

**Solution:** Ensure `clm-registry.yaml` exists and is valid YAML.

### YAML Parse Error

**Error:**
```
YAMLException: bad indentation
```

**Solution:** Check YAML indentation (use 2 spaces, not tabs).

### Iframe Blocked by CSP

**Error:**
```
Refused to frame 'https://...' because it violates CSP
```

**Solution:** Add CSP header to component HTML:
```html
<meta http-equiv="Content-Security-Policy" 
      content="frame-ancestors 'self' https://henry.pkc.pub">
```

### Heartbeats Not Received

**Check:**
1. Component has heartbeat code
2. `componentId` matches registry
3. No JavaScript errors in component

## 📚 Further Reading

- [Full Architecture Documentation](./docs/clm-iframe-architecture.md)
- [Original CLM Implementation Guide](./docs/clm-implementation-guide.md)
- [Component Development Guide](./docs/components/)

## 🤝 Contributing

1. Create new component HTML file
2. Add to `clm-registry.yaml`
3. Update `index-clm.html`
4. Test failure isolation
5. Document in `docs/components/`

## 📝 License

ISC

---

**Version**: 2.0.0  
**Created**: 2025-11-27  
**Status**: Production Ready ✅

**Questions?** Check the [full documentation](./docs/clm-iframe-architecture.md) or open an issue.
