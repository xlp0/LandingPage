# Redux CLM Integration

## Overview

The Redux CLM Integration provides a complete state management solution for the Cubical Logic Model (CLM) architecture. It combines Redux's powerful state management with CLM's iframe-based component isolation.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Redux Store                             │
│                   (Global State Manager)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
          ┌──────────────┐    ┌──────────────┐
          │  CLM Slice   │    │ CLM Middleware│
          │              │    │               │
          │ - Registry   │    │ - postMessage │
          │ - Components │    │ - Broadcasting│
          │ - Events     │    │ - Heartbeats  │
          │ - Heartbeats │    │               │
          └──────────────┘    └──────────────┘
                    │                   │
                    └─────────┬─────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  User List   │      │ User Detail  │      │ Redux Viewer │
│   Component  │      │   Component  │      │   Component  │
│              │      │              │      │              │
│ [iframe]     │      │ [iframe]     │      │ [iframe]     │
│ Redux: users │      │ Redux: users │      │ Redux: all   │
└──────────────┘      └──────────────┘      └──────────────┘
```

---

## Redux CLM Slice

### State Structure

```javascript
{
  clm: {
    // Registry data from YAML
    registry: {
      version: "2.0.0",
      components: [...],
      observability: {...},
      sidecar: {...}
    },
    
    // Loaded component instances
    components: {
      'user-list': {
        id: 'user-list',
        iframeId: 'iframe-user-list',
        url: 'https://henry.pkc.pub/components/user-list.html',
        reduxSlice: 'users',
        status: 'active',
        loadedAt: 1732723200000,
        lastHeartbeat: 1732723500000,
        metrics: {...}
      },
      // ... more components
    },
    
    // Component events (Redux actions from components)
    events: [
      {
        componentId: 'user-list',
        event: 'user_selected',
        data: { userId: 1 },
        timestamp: 1732723400000
      },
      // ... more events
    ],
    
    // Heartbeat tracking
    heartbeats: {
      'user-list': {
        lastHeartbeat: 1732723500000,
        metrics: { usersDisplayed: 5, activeUsers: 3 }
      },
      // ... more heartbeats
    },
    
    // Loading states
    loading: {
      registry: false,
      components: {
        'user-list': false,
        'user-detail': false
      }
    },
    
    // Errors
    errors: {
      registry: null,
      components: {
        'crash-test': 'Component crashed'
      }
    },
    
    // Metrics
    metrics: {
      totalComponents: 5,
      loadedComponents: 4,
      failedComponents: 1,
      totalEvents: 12,
      totalHeartbeats: 48
    }
  }
}
```

---

## Redux Actions

### Async Thunks

#### `fetchCLMRegistry()`
Fetches the CLM registry from `/api/clm/registry`

```javascript
import { fetchCLMRegistry } from './js/redux/slices/clm-slice.js';

// Dispatch
const action = await store.dispatch(fetchCLMRegistry());

// Check result
if (fetchCLMRegistry.fulfilled.match(action)) {
  const registry = action.payload;
  console.log('Registry loaded:', registry);
}
```

#### `loadCLMComponent({ componentId, iframeId })`
Loads a specific component

```javascript
import { loadCLMComponent } from './js/redux/slices/clm-slice.js';

// Dispatch
await store.dispatch(loadCLMComponent({
  componentId: 'user-list',
  iframeId: 'iframe-user-list'
}));
```

### Synchronous Actions

#### `componentLoaded({ componentId, iframeId, url })`
Marks component as loaded

```javascript
import { componentLoaded } from './js/redux/slices/clm-slice.js';

store.dispatch(componentLoaded({
  componentId: 'user-list',
  iframeId: 'iframe-user-list',
  url: 'https://henry.pkc.pub/components/user-list.html'
}));
```

#### `componentFailed({ componentId, error })`
Marks component as failed

```javascript
import { componentFailed } from './js/redux/slices/clm-slice.js';

store.dispatch(componentFailed({
  componentId: 'crash-test',
  error: 'Component crashed: TypeError'
}));
```

#### `componentEvent({ componentId, event, data })`
Records a component event

```javascript
import { componentEvent } from './js/redux/slices/clm-slice.js';

store.dispatch(componentEvent({
  componentId: 'user-list',
  event: 'user_selected',
  data: { userId: 1 }
}));
```

#### `componentHeartbeat({ componentId, timestamp, metrics })`
Records a component heartbeat

```javascript
import { componentHeartbeat } from './js/redux/slices/clm-slice.js';

store.dispatch(componentHeartbeat({
  componentId: 'user-list',
  timestamp: Date.now(),
  metrics: { usersDisplayed: 5 }
}));
```

---

## CLM Middleware

The CLM middleware bridges iframe postMessage events with Redux actions.

### Features:

1. **Automatic Event Listening**: Listens to `postMessage` from all iframes
2. **Redux Dispatch**: Converts CLM events to Redux actions
3. **State Broadcasting**: Broadcasts Redux state to components
4. **Heartbeat Monitoring**: Detects component failures via timeout

### Event Flow:

```
Component (iframe) → postMessage → CLM Middleware → Redux Action → Redux Store
                                                                        ↓
                                                                   State Update
                                                                        ↓
                                                    Broadcast to all components
```

### Handled Message Types:

- `clm_event`: Component fired an event (e.g., user_selected)
- `clm_heartbeat`: Component is alive and healthy
- `clm_error`: Component encountered an error
- `request_redux_state`: Component requests current Redux state

---

## Selectors

### Basic Selectors

```javascript
import {
  selectCLMRegistry,
  selectCLMComponents,
  selectCLMEvents,
  selectCLMMetrics
} from './js/redux/slices/clm-slice.js';

const state = store.getState();

const registry = selectCLMRegistry(state);
const components = selectCLMComponents(state);
const events = selectCLMEvents(state);
const metrics = selectCLMMetrics(state);
```

### Parameterized Selectors

```javascript
import {
  selectComponentById,
  selectComponentsBySlice,
  selectActiveComponents,
  selectFailedComponents
} from './js/redux/slices/clm-slice.js';

const state = store.getState();

// Get specific component
const userList = selectComponentById('user-list')(state);

// Get all components using 'users' slice
const userComponents = selectComponentsBySlice('users')(state);

// Get active components
const active = selectActiveComponents(state);

// Get failed components
const failed = selectFailedComponents(state);
```

---

## Component Integration

### Sending Events from Component

```javascript
// Inside iframe component
window.parent.postMessage({
  type: 'clm_event',
  componentId: 'user-list',
  event: 'user_selected',
  data: { userId: 1 }
}, '*');
```

### Receiving Redux State in Component

```javascript
// Inside iframe component
window.addEventListener('message', (event) => {
  if (event.data.type === 'redux_state_update') {
    const reduxState = event.data.state;
    console.log('Redux state:', reduxState);
    
    // Update component based on Redux state
    if (reduxState.clm) {
      updateUI(reduxState.clm);
    }
  }
});

// Request Redux state
window.parent.postMessage({
  type: 'request_redux_state',
  componentId: 'user-list'
}, '*');
```

### Sending Heartbeats

```javascript
// Inside iframe component
setInterval(() => {
  window.parent.postMessage({
    type: 'clm_heartbeat',
    componentId: 'user-list',
    timestamp: Date.now(),
    metrics: {
      usersDisplayed: 5,
      activeUsers: 3
    }
  }, '*');
}, 3000);
```

---

## Usage Example

### Main Dashboard Setup

```javascript
import store from './js/redux/store.js';
import { fetchCLMRegistry, loadCLMComponent } from './js/redux/slices/clm-slice.js';

// Fetch registry
const registryAction = await store.dispatch(fetchCLMRegistry());

if (fetchCLMRegistry.fulfilled.match(registryAction)) {
  const registry = registryAction.payload;
  
  // Load each component
  for (const component of registry.components) {
    await store.dispatch(loadCLMComponent({
      componentId: component.id,
      iframeId: `iframe-${component.id}`
    }));
    
    // Set iframe src
    const iframe = document.getElementById(`iframe-${component.id}`);
    iframe.src = component.url;
  }
}

// Subscribe to state changes
store.subscribe(() => {
  const state = store.getState();
  console.log('Components loaded:', Object.keys(state.clm.components).length);
  console.log('Total events:', state.clm.events.length);
});
```

---

## Benefits

### 1. **Centralized State Management**
- All component state in one Redux store
- Easy to debug with Redux DevTools
- Predictable state updates

### 2. **Component Isolation**
- Components run in sandboxed iframes
- Failures don't propagate
- Independent deployment

### 3. **Event-Driven Architecture**
- Components communicate via events
- Loose coupling between components
- Easy to add new components

### 4. **Real-time Monitoring**
- Heartbeat tracking
- Failure detection
- Performance metrics

### 5. **Redux Integration**
- Each component mapped to Redux slice
- Standard Redux patterns (actions, reducers, selectors)
- Middleware for cross-cutting concerns

---

## Debugging

### Enable Redux DevTools

Redux DevTools is enabled by default in the store configuration.

### View Redux State in Console

```javascript
// Access store from console
window.reduxStore.getState();

// View CLM state
window.reduxStore.getState().clm;

// View specific component
window.reduxStore.getState().clm.components['user-list'];
```

### Monitor Actions

```javascript
// Subscribe to all actions
window.reduxStore.subscribe(() => {
  console.log('State updated:', window.reduxStore.getState());
});
```

---

## Best Practices

### 1. **Component Design**
- Keep components small and focused
- Use Redux slices for shared state
- Send heartbeats regularly (every 3-5 seconds)

### 2. **Error Handling**
- Always wrap component code in try-catch
- Report errors via `clm_error` message
- Implement graceful degradation

### 3. **Performance**
- Minimize postMessage frequency
- Batch state updates
- Use selectors for derived state

### 4. **Testing**
- Test components in isolation
- Mock Redux store for unit tests
- Test failure scenarios

---

## File Structure

```
js/
├── redux/
│   ├── store.js                    # Redux store configuration
│   ├── slices/
│   │   └── clm-slice.js           # CLM Redux slice
│   └── middleware/
│       └── clm-middleware.js      # CLM middleware
└── clm-iframe-loader.js           # CLM loader (legacy)

components/
├── user-list.html                 # User list component
├── user-detail.html               # User detail component
└── redux-state-viewer.html        # Redux state viewer

clm-registry.yaml                  # Component registry
```

---

## Next Steps

1. **Add More Slices**: Create auth, users, ui slices
2. **Real Data**: Connect to backend APIs
3. **Persistence**: Add Redux persist for state
4. **Testing**: Add unit and integration tests
5. **Documentation**: Document each component's Redux integration

---

**For more information, see:**
- `docs/clm-iframe-architecture.md` - CLM architecture overview
- `CLM-QUICKSTART.md` - Quick start guide
- `DEMO-GUIDE.md` - Demo presentation guide
