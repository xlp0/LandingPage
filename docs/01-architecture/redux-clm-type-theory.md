---
title: "Redux and CLM: A Type-Theoretic Architecture"
authors: Ben Koo, Antigravity
created: 2025-12-19T12:07:00+08:00
subject: Redux, CLM, Sum Types, Product Types, Type Theory, State Management, Compositional Architecture
---

# Redux and CLM: A Type-Theoretic Architecture

> **This document explains how the LandingPage project organizes information processing using Redux slices, Cubical Logic Models (CLM), and the compositional principles of Sum Types and Product Types.**

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Theoretical Foundation](#theoretical-foundation)
3. [Redux as a Type System](#redux-as-a-type-system)
4. [Slice Architecture](#slice-architecture)
5. [CLM and Redux Integration](#clm-and-redux-integration)
6. [Sum Types and Product Types](#sum-types-and-product-types)
7. [The REPL-Redux Correspondence](#the-repl-redux-correspondence)
8. [Practical Examples](#practical-examples)
9. [Benefits and Implications](#benefits-and-implications)

---

## Executive Summary

The LandingPage project implements a **compositional architecture** where:

- **Redux** provides the **Single Source of Truth (SSOT)** for application state
- **Slices** are **Product Types** that compose state domains
- **Actions** are **Sum Types** representing state transitions
- **CLM (Cubical Logic Model)** provides **Context × Goal × Success** verification
- **Middleware** bridges concurrent components via the **REPL cycle**

This creates a mathematically rigorous system where **illegal states are unrepresentable** and all transitions are auditable.

---

## Theoretical Foundation

### The Algebraic View

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    BUILDING STATE FROM NOTHING                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ∅ (Void)  →  Actions (+)  →  Reducers (×)  →  Middleware (→)  →  UI       │
│   ─────────    ───────────     ────────────     ─────────────     ────       │
│   Empty        Sum Types       Product Types    Functions         Render     │
│   State        (Choice)        (Composition)    (Transform)       (View)     │
│                                                                              │
│   Example:                                                                   │
│   initialState → LOGIN | LOGOUT → { user × token × session } → render(UI)   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### The Curry-Howard-Lambek Correspondence

| Logic | Type Theory | Redux |
|-------|-------------|-------|
| Proposition | Type | Slice State Shape |
| Proof | Value | State Instance |
| Implication (A → B) | Function | Reducer |
| Disjunction (A ∨ B) | Sum Type | Action Union |
| Conjunction (A ∧ B) | Product Type | State Object |

---

## Redux as a Type System

### The Store as Universe

The Redux store represents a **dependent type** where the shape of the universe is defined by the combination of all slices:

```javascript
// js/redux/store.js
const store = configureStore({
  reducer: {
    clm: clmReducer,              // Component Management
    auth: authReducer,            // Authentication
    cubicModels: cubicModelsReducer,    // CLM Logic (Context, Goal, Success)
    contentRenderer: contentRendererReducer, // MCard Rendering
  }
});
```

**Type Definition:**
```
Store = clm × auth × cubicModels × contentRenderer
```

This is a **Product Type**—the store is the conjunction of all slice states.

### Actions as Sum Types

Actions represent **choices** (Sum Types)—at any moment, exactly ONE action can be dispatched:

```typescript
// Conceptual Type Definition
type CLMAction = 
  | { type: 'clm/setActiveComponent', payload: string }
  | { type: 'clm/componentLoaded', payload: ComponentInfo }
  | { type: 'clm/componentFailed', payload: ErrorInfo }
  | { type: 'clm/componentEvent', payload: EventData }
  | ...

type AuthAction =
  | { type: 'auth/loginWithZitadel', payload: TokenInfo }
  | { type: 'auth/refreshToken' }
  | { type: 'auth/logout' }
  | ...

// The full action space is the SUM of all slice actions
type AppAction = CLMAction | AuthAction | CubicAction | ContentAction
```

**Type Definition:**
```
Action = CLMAction + AuthAction + CubicAction + ContentAction
```

This is a **Sum Type**—exactly one variant is active at any time.

---

## Slice Architecture

### Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         REDUX SLICE ARCHITECTURE                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │   CLM Slice     │  │   Auth Slice    │  │ CubicModels     │              │
│  │   (clm-slice)   │  │  (auth-slice)   │  │     Slice       │              │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤              │
│  │ registry        │  │ user            │  │ models (hash)   │              │
│  │ activeComponent │  │ accessToken     │  │ evaluations     │              │
│  │ components {}   │  │ refreshToken    │  │ activeModel     │              │
│  │ events []       │  │ isAuthenticated │  │ loading         │              │
│  │ heartbeats {}   │  │ loading         │  │ errors          │              │
│  │ metrics         │  │ error           │  └─────────────────┘              │
│  └─────────────────┘  └─────────────────┘                                   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                    Content Renderer Slice                                │ │
│  ├─────────────────────────────────────────────────────────────────────────┤ │
│  │ currentContent │ currentType │ currentHash │ history [] │ settings {}   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 1. CLM Slice (`js/redux/slices/clm-slice.js`)

**Purpose:** Manages Cubical Logic Model component lifecycle.

**State Shape (Product Type):**
```javascript
{
  registry: { version, components[], observability, sidecar },
  activeComponent: string | null,
  components: { [id]: ComponentState },
  events: EventRecord[],
  heartbeats: { [id]: HeartbeatData },
  loading: { registry, components },
  errors: { registry, components },
  metrics: { totalComponents, loadedComponents, failedComponents, ... }
}
```

**Actions (Sum Types):**
| Action | Effect |
|--------|--------|
| `setActiveComponent` | Choose active component (Sum choice) |
| `componentLoaded` | Add to components map (Product extension) |
| `componentFailed` | Transition to error state |
| `componentEvent` | Record event with timestamp |
| `componentHeartbeat` | Update liveness metric |

### 2. Auth Slice (`js/redux/slices/auth-slice.js`)

**Purpose:** Manages OAuth2 authentication with Zitadel.

**State Shape (Product Type):**
```javascript
{
  user: UserInfo | null,
  accessToken: string | null,
  refreshToken: string | null,
  isAuthenticated: boolean,
  loading: boolean,
  error: string | null
}
```

**State Machine (Sum Type Transitions):**
```
                    ┌─────────────────┐
                    │  Unauthenticated │
                    │  (user = null)   │
                    └────────┬────────┘
                             │ loginWithZitadel
                             ▼
                    ┌─────────────────┐
                    │  Authenticated   │◄──────┐
                    │  (user ≠ null)   │       │ refreshToken
                    └────────┬────────┘───────┘
                             │ logout
                             ▼
                    ┌─────────────────┐
                    │  Unauthenticated │
                    └─────────────────┘
```

### 3. Cubic Models Slice (`js/redux/slices/cubic-models-slice.js`)

**Purpose:** Implements the **三套東西 (Three Sets)** CLM pattern.

**The CLM Triad (Product Type):**
```
CLM = Context × Goal × Success
```

| Dimension | Meaning | Redux State |
|-----------|---------|-------------|
| **Context** | The situation/environment | `models[hash]` - stored models |
| **Goal** | The objective/implementation | `activeModel` - current target |
| **Success** | The outcome/metrics | `evaluations[hash]` - results |

**Evaluation Function:**
```javascript
// f(goal, process) → output
evaluateCubicModel: async ({ hash, goal, process }) => {
  // Fetch model (Context)
  // Apply goal and process (Transformation)
  // Return output (Success witness)
}
```

### 4. Content Renderer Slice (`js/redux/slices/content-renderer-slice.js`)

**Purpose:** Renders MCard content based on type detection.

**CONTENT_TYPES as Sum Type:**
```javascript
const CONTENT_TYPES = {
  MARKDOWN | IMAGE | VIDEO | AUDIO | PDF | TEXT | JSON | HTML | CODE | BINARY | UNKNOWN
};
```

This is a **Sum Type**—content is exactly ONE of these types at any moment.

**Type Detection (Pattern Matching):**
```javascript
function detectContentType(mimeType, fileName) {
  // Pattern match on MIME type (Sum)
  if (mimeType && MIME_TYPE_MAP[mimeType]) return MIME_TYPE_MAP[mimeType];
  
  // Pattern match on extension (Sum)
  if (fileName) {
    const ext = fileName.split('.').pop();
    if (EXTENSION_MAP[ext]) return EXTENSION_MAP[ext];
  }
  
  return CONTENT_TYPES.UNKNOWN;
}
```

---

## CLM and Redux Integration

### The Bridge: CLM Middleware

The `clm-middleware.js` bridges **iframe-based CLM components** with the **Redux store**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CLM MIDDLEWARE ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐                                    ┌──────────────┐       │
│  │   CLM        │    postMessage                     │    Redux     │       │
│  │  Component   │ ─────────────────────────────────► │    Store     │       │
│  │  (iframe)    │                                    │              │       │
│  └──────────────┘                                    └──────┬───────┘       │
│         ▲                                                   │               │
│         │                                                   │               │
│         │              ┌────────────────────┐               │               │
│         │              │   CLM Middleware   │               │               │
│         │              ├────────────────────┤               │               │
│         │              │ • Listen to events │               │               │
│         └──────────────│ • Dispatch actions │◄──────────────┘               │
│       broadcastState   │ • Broadcast state  │                               │
│                        │ • Detect timeouts  │                               │
│                        └────────────────────┘                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Event Types (Sum Type):**
```javascript
switch (type) {
  case 'clm_event':     // Component event
  case 'clm_heartbeat': // Liveness check
  case 'clm_error':     // Component failure
}
```

---

## Sum Types and Product Types

### Sum Types (+) in the Project

Sum Types represent **mutually exclusive choices** (OR):

| Location | Sum Type | Variants |
|----------|----------|----------|
| Actions | `Action` | `setActiveComponent \| componentLoaded \| componentFailed \| ...` |
| Content | `CONTENT_TYPES` | `MARKDOWN \| IMAGE \| VIDEO \| ...` |
| Status | `ComponentStatus` | `loaded \| active \| failed \| timeout` |
| Auth State | `AuthState` | `Authenticated \| Unauthenticated \| Loading` |
| 3D Objects | `ObjectChoice` | `Teapot \| Earth \| Solar \| Crystal \| ...` |

### Product Types (×) in the Project

Product Types represent **combined structures** (AND):

| Location | Product Type | Components |
|----------|--------------|------------|
| Store | `AppState` | `clm × auth × cubicModels × contentRenderer` |
| CLM | `CLMTriad` | `Context × Goal × Success` |
| Component | `ComponentState` | `id × status × url × metrics × heartbeat` |
| Auth | `AuthState` | `user × accessToken × refreshToken × isAuthenticated` |
| 3D Scene | `Scene` | `Geometry × Material × Transform × Animation` |

### Composition Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    SUM TYPES vs PRODUCT TYPES                                │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   SUM TYPES (+): "One of these"            PRODUCT TYPES (×): "All of these"│
│   ─────────────────────────────            ──────────────────────────────── │
│                                                                              │
│   ┌─────┐                                  ┌─────────────────────────────┐   │
│   │  A  │──┐                               │ A × B × C                   │   │
│   └─────┘  │                               ├─────┬─────┬─────────────────┤   │
│            ├──► A + B + C                  │  a  │  b  │       c         │   │
│   ┌─────┐  │   (exactly ONE)               └─────┴─────┴─────────────────┘   │
│   │  B  │──┤                                     (ALL together)              │
│   └─────┘  │                                                                 │
│            │                                                                 │
│   ┌─────┐  │                               Redux Example:                    │
│   │  C  │──┘                               store = clm × auth × cubic × ...  │
│   └─────┘                                                                    │
│                                                                              │
│   Redux Example:                            Each slice state is a PRODUCT    │
│   action = LOGIN | LOGOUT | REFRESH         of its fields                    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## The REPL-Redux Correspondence

Every Redux action cycle corresponds to a **REPL** operation:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         REPL ↔ REDUX CORRESPONDENCE                          │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   REPL Phase    │  Redux Equivalent  │  Type Operation  │  Example          │
│   ─────────────────────────────────────────────────────────────────────────  │
│   READ          │  dispatch(action)  │  Sum Type choice │  LOGIN clicked    │
│   EVALUATE      │  reducer(s, a)     │  Pure function   │  Validate creds   │
│   PRINT         │  getState()        │  Product query   │  New user state   │
│   LOOP          │  subscribe()       │  Continuation    │  Re-render UI     │
│                                                                              │
│   ┌────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐          │
│   │  READ  │───►│  EVALUATE  │───►│   PRINT    │───►│    LOOP    │──┐       │
│   └────────┘    └────────────┘    └────────────┘    └────────────┘  │       │
│       ▲                                                             │       │
│       └─────────────────────────────────────────────────────────────┘       │
│                                                                              │
│   CLM Integration:                                                           │
│   • Context  = getState()     (current situation)                            │
│   • Goal     = action.payload (intended change)                              │
│   • Success  = newState       (verified outcome / VCard witness)             │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Practical Examples

### Example 1: Component Selection (Sum Type Choice)

```javascript
// User clicks on a component in the CLM registry
dispatch(setActiveComponent('google-maps'));  // Sum choice: ONE component

// Reducer handles the Sum choice
case 'clm/setActiveComponent':
  state.activeComponent = action.payload;  // Product field update
```

### Example 2: Content Rendering (Type Pattern Match)

```javascript
// Render MCard content
const contentType = detectContentType(mimeType, fileName);

switch (contentType) {
  case CONTENT_TYPES.MARKDOWN:  // Sum variant 1
    return renderMarkdown(content);
  case CONTENT_TYPES.IMAGE:     // Sum variant 2
    return renderImage(content);
  // ... exhaustive Sum type handling
}
```

### Example 3: CLM Evaluation (Full Triad)

```javascript
// Evaluate a Cubic Logic Model
dispatch(evaluateCubicModel({
  hash,                    // Context: What model
  goal: targetState,       // Goal: What we want
  process: transformation  // Process: How to get there
}));

// Result stored as VCard witness
state.evaluations[hash].push({
  goal,
  process,
  output,          // Success: What happened
  timestamp        // Audit trail
});
```

---

## Benefits and Implications

### 1. **Illegal States Are Unrepresentable**

By modeling actions as Sum Types, only valid transitions are possible:
- Can't be both `authenticated` AND `unauthenticated`
- Can't render content as both `IMAGE` AND `VIDEO`
- Component is exactly ONE of `loaded | active | failed | timeout`

### 2. **Predictable State Transitions**

All reducers are **pure functions**:
```
reducer: (State, Action) → State
```
Same input always produces same output—no side effects.

### 3. **Composable Architecture**

Product Types compose naturally:
```
AppState = Slice1 × Slice2 × Slice3 × ...
```
Adding a new slice extends the Product.

### 4. **Auditable History**

Every action is logged with timestamps:
```javascript
state.events.push({ componentId, event, data, timestamp });
state.history.push({ hash, content, contentType, renderedAt });
state.evaluations[hash].push({ goal, process, output, timestamp });
```

### 5. **CLM Alignment**

The **三套東西** (Context × Goal × Success) maps directly to Redux:
```
| CLM         | Redux                          |
|-------------|--------------------------------|
| Context     | getState() before action       |
| Goal        | action.payload                 |
| Success     | getState() after reducer       |
```

---

## Conclusion

The LandingPage project demonstrates how **Redux** and **CLM** implement a rigorous **type-theoretic architecture**:

- **Sum Types** for choices (actions, content types, component states)
- **Product Types** for composition (store, slice states, component data)
- **REPL cycle** for temporal flow (dispatch → reduce → render → loop)
- **CLM triad** for verification (Context × Goal × Success)

This creates a system where:
- ✅ All state is predictable
- ✅ All transitions are auditable
- ✅ All compositions are type-safe
- ✅ All illegal states are unrepresentable

---

## Related Documents

- [3D Theater README](../public/examples/THREEJS_ANIMEJS/README.md) - ABC Theatre implementation
- [Redux Architecture](05-state-management/redux/REDUX_ARCHITECTURE.md) - Redux patterns
- [CLM Language Specification](03-data-management/mcard/CLM_Language_Specification_v2.md) - CLM syntax

---

**Last Updated:** December 19, 2025
