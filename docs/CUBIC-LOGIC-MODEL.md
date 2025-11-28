# Cubic Logic Model (CLM) Implementation

## 🎯 Core Principle: 三套東西 (Three Sets)

The Cubic Logic Model is fundamentally based on **simplicity**. It has only three sets of things:

### The Three Sets

1. **Context (Abstract)** - "Contact" (接觸)
   - The situation/environment
   - The entry point for understanding
   - Can be a very long article or document

2. **Goal (Concrete)** - "Goal" (目標)
   - The objective/implementation
   - The actual work to be done
   - The concrete action or artifact

3. **Success (Balanced)** - "Success" (成功)
   - The outcome/metrics
   - How we measure achievement
   - The balanced result

### Each Set is a Function

```
f(goal, process) → output
```

Every component in the CLM is a function that takes:
- **Input**: Goal and Process
- **Output**: Result

## 📦 Hash-Based Detail Representation

Details are represented as **hash values** (or URLs in our implementation):

```yaml
abstract:
  context: "Entry point for user interaction"  # Could be a hash pointing to a long document
  goal: "Greet user and set narrative tone"

concrete:
  implementation: "https://henry.pkc.pub/components/welcome.html"  # Hash/URL to actual code
  sandbox: "allow-scripts"

balanced:
  metrics_endpoint: "/metrics/welcome"  # Hash/URL to metrics
  health_check: "/health/welcome"
  expected_load_time_ms: 500
```

A hash value can point to:
- 📄 Long articles or documentation
- 🖼️ Images or media
- 🔗 Nested logic models (recursive CLM)
- 📊 Complex data structures
- 🎯 Any other resource

## 🏗️ Implementation in Landing Page

### 1. Redux Slice: `cubic-models-slice.js`

Manages cubic models in Redux state:

```javascript
// State structure
{
  models: {
    [hash]: {
      abstract: { context, goal },
      concrete: { implementation, sandbox },
      balanced: { metrics, health_check }
    }
  },
  evaluations: {
    [hash]: [
      { goal, process, output, timestamp }
    ]
  },
  activeModel: hash
}
```

### 2. CLM Registry: `clm-registry.yaml`

Each component follows the three-set structure:

```yaml
components:
  - id: "component-id"
    name: "Component Name"
    url: "https://..."  # Hash/URL
    
    abstract:           # Context (接觸)
      context: "..."
      goal: "..."
    
    concrete:           # Goal (目標)
      implementation: "..."
      sandbox: "..."
    
    balanced:           # Success (成功)
      metrics_endpoint: "..."
      health_check: "..."
```

### 3. Component Lifecycle

```
1. Load Registry → Parse CLM structure
2. For each component:
   - Abstract: Understand context
   - Concrete: Load implementation
   - Balanced: Monitor metrics
3. Evaluate: f(goal, process) → output
4. Store result in Redux
```

## 🎨 The Safe Analogy

Think of CLM as a **minimalist safe** with three controls:

```
┌─────────────────────┐
│   CUBIC SAFE        │
│                     │
│  ⚙️ Context         │  ← Simple interface
│  ⚙️ Goal            │  ← Only 3 controls
│  ⚙️ Success         │  ← Clean exterior
│                     │
│  [Hash Values]      │  ← Each points to complex internals
│   └─→ 📄 Documents  │
│   └─→ 🖼️ Images     │
│   └─→ 🔗 Models     │
└─────────────────────┘
```

You don't see the complex gears inside. Each control (hash) points to detailed blueprints or procedures.

## 🔄 Transformation Process

> "The entire structure should eventually transition so that all things slowly begin to transform into a logic model."

### Current State
- ✅ CLM registry structure implemented
- ✅ Components follow three-set pattern
- ✅ Redux slice for cubic models
- ✅ Hash-based references (URLs)

### Future Evolution
1. **Convert existing features** → CLM components
2. **Nested models** → Components can contain other CLM models
3. **Everything becomes a model** → Gradual transformation
4. **Simplification** → Remove redundancy, keep only CLM structure

## 📊 Benefits of CLM

### 1. Simplicity
- Only 3 sets to understand
- Clear structure for every component
- Easy to reason about

### 2. Modularity
- Each component is independent
- Hash-based references enable loose coupling
- Can nest models recursively

### 3. Scalability
- Add new components without changing structure
- Complex details hidden behind hashes
- Clean interface remains simple

### 4. Observability
- Balanced set provides metrics
- Each component has health checks
- Easy to monitor and debug

## 🚀 Usage Examples

### Fetch a Cubic Model

```javascript
import { fetchCubicModel } from './js/redux/slices/cubic-models-slice.js';

// Fetch by hash
store.dispatch(fetchCubicModel('welcome-component-hash'));
```

### Evaluate a Model

```javascript
import { evaluateCubicModel } from './js/redux/slices/cubic-models-slice.js';

// Evaluate: f(goal, process) → output
store.dispatch(evaluateCubicModel({
  hash: 'component-hash',
  goal: 'Display user greeting',
  process: { userId: '123', timestamp: Date.now() }
}));
```

### Create a New Model

```javascript
import { createCubicModel } from './js/redux/slices/cubic-models-slice.js';

store.dispatch(createCubicModel({
  abstract: {
    context: 'User authentication flow',
    goal: 'Secure user login'
  },
  concrete: {
    implementation: 'https://henry.pkc.pub/components/auth.html',
    sandbox: 'allow-scripts allow-popups'
  },
  balanced: {
    metrics_endpoint: '/metrics/auth',
    health_check: '/health/auth',
    expected_load_time_ms: 300
  }
}));
```

## 📝 Key Takeaways

1. **Three Sets Only**: Context, Goal, Success (三套東西)
2. **Function-Based**: Each set is `f(goal, process) → output`
3. **Hash Values**: Details hidden behind simple references
4. **Simplicity First**: Keep the interface clean and minimal
5. **Gradual Transformation**: Everything slowly becomes a logic model

---

**The Cubic Logic Model is the foundation for systematic modularization and cleanup of the entire codebase.**
