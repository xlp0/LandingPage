# CLM Implementation Guide: YAML-Based Cubical Logic Model

## 🔷 Executive Summary

This document defines the implementation of the **Cubical Logic Model (CLM)** using YAML as the canonical format for component specification. The CLM YAML structure serves as the **Single Source of Truth** for all components in the Cubical HTML architecture, enforcing extreme compression, mandatory observability, and mathematical verifiability.

## 🎯 Core Principles

### 1. Extreme Compression
- **Vocabulary Minimization**: The YAML uses the smallest possible set of keys.
- **Hash-Based Values**: All content (files, URLs, strings, images) is represented as a hash value.
- **Content Retrieval**: Hashes map to MCard (Mart Collection) entries for actual content resolution.
- **Result**: Small payload → Fast loading → Verifiable integrity.

### 2. Single Source of Truth
- The YAML file is the **namespace** for the component.
- All dimensions (Abstract, Concrete, Balanced) are referenced through this single file.
- The network "sucks in" information to validate against this source, rather than broadcasting.

### 3. Mandatory Observability
- Every component must define its observability contract.
- Metrics, Logs, and Traces (MLT) are first-class citizens in the CLM structure.
- The "Sidecar" pattern is enforced at the specification level.

## 📐 The Three Irreducible Dimensions

Every CLM concept is mathematically defined as a **triple of hashes**:

```
CLM = (h_spec, h_impl, h_exp)
```

Where:
- `h_spec` = Hash of Abstract Specification (Intent/Logic)
- `h_impl` = Hash of Concrete Implementation (Executable Code)
- `h_exp` = Hash of Balanced Expectations (Validation Criteria)

### Dimension Breakdown

| Dimension | Role | Purpose | YAML Keys | Artifacts |
|-----------|------|---------|-----------|-----------|
| **Abstract Specification** (`h_spec`) | Trader | Defines "What" (Truth Proposition) | `context`, `goal` | Natural language, Type signatures |
| **Concrete Implementation** (`h_impl`) | Coder | Defines "How" (Proof) | `input`, `output`, `code_hash` | Executable code, DOM structure |
| **Balanced Expectations** (`h_exp`) | Miner | Defines "Why" (Verification) | `success_criteria`, `metrics`, `logs`, `traces` | Telemetry, Test cases |

## 🛠️ YAML Structure Specification

### Minimal CLM YAML Template

```yaml
# Component CLM Definition
component_id: "auth-status-component"
version: "1.0.0"

# Abstract Dimension (h_spec)
abstract:
  context: "sha256:a1b2c3d4..."  # Hash of context description
  goal: "sha256:e5f6g7h8..."     # Hash of goal statement
  
# Concrete Dimension (h_impl)
concrete:
  code_hash: "sha256:i9j0k1l2..."  # Hash of implementation code
  input:
    - type: "click_event"
      source: "button#auth-button"
      hash: "sha256:m3n4o5p6..."
  output:
    - type: "dom_update"
      target: "#auth-user-info"
      hash: "sha256:q7r8s9t0..."
  
# Balanced Dimension (h_exp)
balanced:
  success_criteria:
    - criterion: "login_success_rate"
      threshold: 0.95
      hash: "sha256:u1v2w3x4..."
  metrics:
    - name: "auth.login.duration"
      type: "histogram"
      hash: "sha256:y5z6a7b8..."
  logs:
    - event: "auth.login.attempt"
      level: "info"
      hash: "sha256:c9d0e1f2..."
  traces:
    - span: "auth.oauth.flow"
      hash: "sha256:g3h4i5j6..."

# Observability Sidecar
observability:
  prometheus_endpoint: "/metrics"
  loki_labels:
    component: "auth-status"
    app: "pkc-landing"
  grafana_dashboard: "sha256:k7l8m9n0..."
```

### Key Definitions

#### Standardized Keys

| Key | Type | Purpose | Example Value |
|-----|------|---------|---------------|
| `context` | Hash | Describes the situational boundary | `sha256:...` (MCard ID) |
| `goal` | Hash | Defines the intended outcome | `sha256:...` (MCard ID) |
| `success_criteria` | Array[Hash] | Validation rules | List of criterion hashes |
| `input` | Array[Object] | Expected inputs (events, data) | Event type + hash |
| `output` | Array[Object] | Produced outputs (DOM, state) | Target + hash |
| `code_hash` | Hash | Implementation artifact | `sha256:...` (Code file hash) |
| `metrics` | Array[Object] | Prometheus metrics | Metric name + hash |
| `logs` | Array[Object] | Loki log events | Event name + hash |
| `traces` | Array[Object] | Distributed traces | Span name + hash |

## 🔍 Implementation Process

### Step 1: Define the Abstract (Trader Role)

Create the specification document (Markdown/Text):

```markdown
# Auth Status Component Specification

## Context
User identity must be established before P2P participation.
Session boundary defined by OAuth token validity.

## Goal
Provide a single-click authentication interface that:
- Displays current auth state (Anonymous/Authenticated)
- Triggers OAuth flow on click
- Updates UI immediately upon state change
```

**Action**: Hash this document → `h_spec`

```bash
sha256sum auth-status-spec.md
# Output: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6...
```

### Step 2: Implement the Concrete (Coder Role)

Write the component code (`AuthStatusComponent.js`):

```javascript
class AuthStatusComponent extends CubicalComponent {
    mount() { /* ... */ }
    updateUser(user) { /* ... */ }
}
```

**Action**: Hash the implementation → `h_impl`

```bash
sha256sum AuthStatusComponent.js
# Output: i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4...
```

### Step 3: Define the Balanced (Miner Role)

Create the validation criteria and observability config:

```yaml
# auth-status-expectations.yaml
success_criteria:
  - login_success_rate > 95%
  - ui_update_latency < 100ms
  - oauth_token_refresh_success > 99%

metrics:
  - auth.login.attempts (counter)
  - auth.login.duration (histogram)
  - auth.token.refresh.errors (counter)

logs:
  - auth.login.attempt (info)
  - auth.login.success (info)
  - auth.login.failure (error)

traces:
  - auth.oauth.flow (span)
  - auth.token.exchange (span)
```

**Action**: Hash this config → `h_exp`

```bash
sha256sum auth-status-expectations.yaml
# Output: u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6...
```

### Step 4: Assemble the CLM YAML

```yaml
component_id: "auth-status-component"
version: "1.0.0"

abstract:
  context: "sha256:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6..."
  goal: "sha256:e5f6g7h8..."

concrete:
  code_hash: "sha256:i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4..."
  
balanced:
  expectations_hash: "sha256:u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6..."
```

### Step 5: Store in MCard Collection

Each hash points to an MCard entry:

```json
{
  "mcard_id": "sha256:a1b2c3d4...",
  "content_type": "text/markdown",
  "content": "# Auth Status Component Specification\n...",
  "created_at": "2025-11-27T16:00:00Z",
  "signature": "..."
}
```

## 🔗 Integration with Cubical HTML

### Component Registration

```javascript
// js/pkc-core.js
PKC.registerCLM('auth-status-component', {
    yamlPath: '/clm/auth-status-component.yaml',
    mcardEndpoint: '/api/mcard'
});
```

### Runtime Validation

```javascript
async function validateComponent(componentId) {
    const clm = await fetch(`/clm/${componentId}.yaml`).then(r => r.yaml());
    
    // Fetch and verify each dimension
    const spec = await fetchMCard(clm.abstract.context);
    const impl = await fetchMCard(clm.concrete.code_hash);
    const exp = await fetchMCard(clm.balanced.expectations_hash);
    
    // Verify hashes
    assert(sha256(spec) === clm.abstract.context);
    assert(sha256(impl) === clm.concrete.code_hash);
    assert(sha256(exp) === clm.balanced.expectations_hash);
    
    // Component is verified
    return true;
}
```

## 📊 Observability Integration

### Prometheus Metrics

```javascript
// Auto-generated from CLM YAML
const authMetrics = {
    loginAttempts: new prometheus.Counter({
        name: 'auth_login_attempts_total',
        help: 'Total login attempts',
        labelNames: ['component', 'result']
    }),
    loginDuration: new prometheus.Histogram({
        name: 'auth_login_duration_seconds',
        help: 'Login duration',
        buckets: [0.1, 0.5, 1, 2, 5]
    })
};
```

### Loki Logs

```javascript
// Auto-instrumented from CLM
logger.info('auth.login.attempt', {
    component: 'auth-status',
    user_id: user.id,
    timestamp: Date.now()
});
```

### Grafana Dashboard

The `grafana_dashboard` hash in the CLM YAML points to a dashboard JSON definition stored as an MCard.

## 🎯 Benefits of CLM YAML Implementation

1. **Verifiability**: Every component has a cryptographic proof of its specification, implementation, and validation criteria.
2. **Immutability**: Hashes ensure that changes are tracked and auditable.
3. **Compression**: Minimal vocabulary reduces cognitive load and payload size.
4. **Observability**: Metrics/Logs/Traces are first-class, not afterthoughts.
5. **Single Source of Truth**: The YAML is the canonical reference for all three dimensions.
6. **Interoperability**: YAML ↔ JSON mapping ensures compatibility with existing tools.

## 📝 Example: Complete CLM for Auth Status Component

See: `/clm/auth-status-component.yaml` (Full implementation)

```yaml
component_id: "auth-status-component"
version: "1.0.0"
created: "2025-11-27T16:00:00Z"

# Triple Hash (CLM Core)
clm_triple:
  h_spec: "sha256:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"
  h_impl: "sha256:i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6k7l8m9n0"
  h_exp: "sha256:u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v8w9x0y1z2"

# Abstract Dimension
abstract:
  context: "sha256:a1b2c3d4..."
  goal: "sha256:e5f6g7h8..."
  type_signature: "sha256:i9j0k1l2..."

# Concrete Dimension
concrete:
  code_hash: "sha256:m3n4o5p6..."
  dom_structure: "sha256:q7r8s9t0..."
  dependencies:
    - "cubical-core.js": "sha256:u1v2w3x4..."
    - "auth-manager.js": "sha256:y5z6a7b8..."
  input:
    - type: "click_event"
      source: "button#auth-button"
      schema: "sha256:c9d0e1f2..."
  output:
    - type: "dom_update"
      target: "#auth-user-info"
      schema: "sha256:g3h4i5j6..."

# Balanced Dimension
balanced:
  success_criteria:
    - id: "login_success_rate"
      threshold: 0.95
      measurement: "sha256:k7l8m9n0..."
    - id: "ui_update_latency"
      threshold: 100
      unit: "ms"
      measurement: "sha256:o1p2q3r4..."
  metrics:
    - name: "auth.login.attempts"
      type: "counter"
      labels: ["result"]
      definition: "sha256:s5t6u7v8..."
    - name: "auth.login.duration"
      type: "histogram"
      buckets: [0.1, 0.5, 1, 2, 5]
      definition: "sha256:w9x0y1z2..."
  logs:
    - event: "auth.login.attempt"
      level: "info"
      schema: "sha256:a3b4c5d6..."
    - event: "auth.login.success"
      level: "info"
      schema: "sha256:e7f8g9h0..."
    - event: "auth.login.failure"
      level: "error"
      schema: "sha256:i1j2k3l4..."
  traces:
    - span: "auth.oauth.flow"
      parent: "app.init"
      definition: "sha256:m5n6o7p8..."

# Observability Configuration
observability:
  prometheus:
    endpoint: "/metrics"
    scrape_interval: "15s"
  loki:
    endpoint: "/loki/api/v1/push"
    labels:
      component: "auth-status"
      app: "pkc-landing"
      environment: "production"
  grafana:
    dashboard_id: "sha256:q9r0s1t2..."
    panel_ids:
      - "auth-login-rate"
      - "auth-latency-p95"
      - "auth-error-rate"

# Verification
verification:
  last_verified: "2025-11-27T16:00:00Z"
  verifier: "pkc-validator-v1.0"
  signature: "sha256:u3v4w5x6..."
```

## 🚀 Next Steps

1. **Create CLM YAML for each component** in `clm/components/`
2. **Implement MCard storage backend** for hash resolution
3. **Build CLM validator** to verify triple hash integrity
4. **Integrate with CI/CD** to auto-generate CLM on code changes
5. **Deploy observability stack** (Prometheus, Loki, Grafana, Tanos)
6. **Create Grafana dashboards** from CLM definitions

## 📚 References

- [Cubical Logic Model for WebRTC](../cubical-logic-model-for-webrtc.md)
- [CLM Think Structure](../clm-think-structure.md)
- [CLM Structure Diagram](../clm-structure-diagram.md)
- [PKC Documentation](https://pkc.pub)
