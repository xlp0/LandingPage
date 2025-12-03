/**
 * CLM Redux Slice
 * Manages Cubical Logic Model component state, events, and lifecycle
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Helper function to resolve component URLs
// If URL is relative (doesn't start with http:// or https://), prepend BASE_URL
function resolveComponentURL(url, baseURL) {
  if (!url) return url;
  
  // If URL is absolute (starts with http:// or https://), return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If URL is relative, prepend BASE_URL
  // Remove trailing slash from baseURL and leading slash from url if present
  const cleanBaseURL = baseURL.replace(/\/$/, '');
  const cleanURL = url.startsWith('/') ? url : `/${url}`;
  
  return `${cleanBaseURL}${cleanURL}`;
}

// Async thunk to fetch CLM registry
export const fetchCLMRegistry = createAsyncThunk(
  'clm/fetchRegistry',
  async (_, { rejectWithValue }) => {
    try {
      console.log('[CLM Slice] Fetching registry...');
      
      // Fetch BASE_URL from environment
      const envResponse = await fetch('/api/env');
      const envData = await envResponse.json();
      const baseURL = envData.BASE_URL || window.location.origin;
      
      console.log('[CLM Slice] BASE_URL:', baseURL);
      
      // Fetch registry
      const response = await fetch('/api/clm/registry');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const registry = data.registry || data;
      
      // Resolve relative URLs in components
      if (registry.components && Array.isArray(registry.components)) {
        registry.components = registry.components.map(component => {
          if (component.concrete && component.concrete.implementation) {
            const originalImpl = component.concrete.implementation;
            const resolvedURL = resolveComponentURL(originalImpl, baseURL);
            console.log(`[CLM Slice] Resolved ${component.hash}: ${originalImpl} → ${resolvedURL}`);
            return {
              ...component,
              concrete: {
                ...component.concrete,
                originalImplementation: originalImpl,  // Keep original for categorization
                implementation: resolvedURL
              }
            };
          }
          return component;
        });
      }
      
      console.log('[CLM Slice] Registry loaded:', registry.components.length, 'components');
      return registry;
    } catch (error) {
      console.error('[CLM Slice] Registry fetch failed:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk to load a specific component
export const loadCLMComponent = createAsyncThunk(
  'clm/loadComponent',
  async ({ componentId, iframeId }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const component = state.clm.registry.components.find(c => c.hash === componentId);
      
      if (!component) {
        throw new Error(`Component ${componentId} not found in registry`);
      }

      return {
        componentId,
        iframeId,
        component,
        loadedAt: Date.now()
      };
    } catch (error) {
      console.error('[CLM Slice] Failed to load component:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Initial state
const initialState = {
  // Registry data
  registry: {
    version: null,
    components: [],
    observability: null,
    sidecar: null
  },
  
  // Active component selection
  activeComponent: null,
  // Example: 'welcome' or 'google-maps'
  
  // Component instances
  components: {},
  // Example: { 'user-list': { id: 'user-list', status: 'loaded', iframeId: 'iframe-user-list', ... } }
  
  // Component events
  events: [],
  // Example: [{ type: 'user_selected', componentId: 'user-list', data: {...}, timestamp: ... }]
  
  // Heartbeats
  heartbeats: {},
  // Example: { 'user-list': { lastHeartbeat: timestamp, metrics: {...} } }
  
  // Loading states
  loading: {
    registry: false,
    components: {}
  },
  
  // Errors
  errors: {
    registry: null,
    components: {}
  },
  
  // Metrics
  metrics: {
    totalComponents: 0,
    loadedComponents: 0,
    failedComponents: 0,
    totalEvents: 0,
    totalHeartbeats: 0
  }
};

// CLM Slice
const clmSlice = createSlice({
  name: 'clm',
  initialState,
  reducers: {
    // Component lifecycle actions
    componentLoaded: (state, action) => {
      const { componentId, iframeId, url } = action.payload;
      state.components[componentId] = {
        id: componentId,
        iframeId,
        url,
        status: 'loaded',
        loadedAt: Date.now(),
        lastHeartbeat: null,
        metrics: {}
      };
      state.metrics.loadedComponents += 1;
      console.log(`[CLM Slice] Component loaded: ${componentId}`);
    },

    componentFailed: (state, action) => {
      const { componentId, error } = action.payload;
      if (state.components[componentId]) {
        state.components[componentId].status = 'failed';
        state.components[componentId].error = error;
      }
      state.errors.components[componentId] = error;
      state.metrics.failedComponents += 1;
      console.error(`[CLM Slice] Component failed: ${componentId}`, error);
    },

    componentUnloaded: (state, action) => {
      const { componentId } = action.payload;
      if (state.components[componentId]) {
        delete state.components[componentId];
        state.metrics.loadedComponents -= 1;
      }
      console.log(`[CLM Slice] Component unloaded: ${componentId}`);
    },

    // Set active component
    setActiveComponent: (state, action) => {
      const componentHash = action.payload;
      state.activeComponent = componentHash;
      console.log(`[CLM Slice] Active component set to: ${componentHash}`);
    },

    // Clear active component
    clearActiveComponent: (state) => {
      state.activeComponent = null;
      console.log(`[CLM Slice] Active component cleared`);
    },

    // Event handling
    componentEvent: (state, action) => {
      const { componentId, event, data } = action.payload;
      const eventRecord = {
        componentId,
        event,
        data,
        timestamp: Date.now()
      };
      
      state.events.unshift(eventRecord);
      
      // Keep only last 50 events
      if (state.events.length > 50) {
        state.events = state.events.slice(0, 50);
      }
      
      state.metrics.totalEvents += 1;
      console.log(`[CLM Slice] Event from ${componentId}:`, event, data);
    },

    // Heartbeat handling
    componentHeartbeat: (state, action) => {
      const { componentId, timestamp, metrics } = action.payload;
      
      state.heartbeats[componentId] = {
        lastHeartbeat: timestamp,
        metrics: metrics || {}
      };
      
      // Update component status
      if (state.components[componentId]) {
        state.components[componentId].lastHeartbeat = timestamp;
        state.components[componentId].status = 'active';
      }
      
      state.metrics.totalHeartbeats += 1;
    },

    // Detect failed components (no heartbeat)
    detectFailedComponents: (state) => {
      const now = Date.now();
      const timeout = 10000; // 10 seconds
      
      Object.keys(state.components).forEach(componentId => {
        const component = state.components[componentId];
        const heartbeat = state.heartbeats[componentId];
        
        if (heartbeat && (now - heartbeat.lastHeartbeat) > timeout) {
          component.status = 'timeout';
          state.metrics.failedComponents += 1;
          console.warn(`[CLM Slice] Component timeout: ${componentId}`);
        }
      });
    },

    // Clear events
    clearEvents: (state) => {
      state.events = [];
      state.metrics.totalEvents = 0;
    },

    // Reset metrics
    resetMetrics: (state) => {
      state.metrics = {
        totalComponents: state.registry.components.length,
        loadedComponents: Object.keys(state.components).length,
        failedComponents: 0,
        totalEvents: 0,
        totalHeartbeats: 0
      };
    }
  },

  extraReducers: (builder) => {
    // Fetch registry
    builder
      .addCase(fetchCLMRegistry.pending, (state) => {
        state.loading.registry = true;
        state.errors.registry = null;
        console.log('[CLM Slice] Fetching registry...');
      })
      .addCase(fetchCLMRegistry.fulfilled, (state, action) => {
        state.loading.registry = false;
        state.registry = action.payload;
        state.metrics.totalComponents = action.payload.components?.length || 0;
        console.log('[CLM Slice] Registry loaded:', action.payload);
      })
      .addCase(fetchCLMRegistry.rejected, (state, action) => {
        state.loading.registry = false;
        state.errors.registry = action.payload;
        console.error('[CLM Slice] Registry fetch failed:', action.payload);
      });

    // Load component
    builder
      .addCase(loadCLMComponent.pending, (state, action) => {
        const componentId = action.meta.arg.componentId;
        state.loading.components[componentId] = true;
        state.errors.components[componentId] = null;
      })
      .addCase(loadCLMComponent.fulfilled, (state, action) => {
        const { componentId, iframeId, component } = action.payload;
        state.loading.components[componentId] = false;
        state.components[componentId] = {
          id: componentId,
          iframeId,
          url: component.url,
          reduxSlice: component.concrete?.redux_slice,
          status: 'loaded',
          loadedAt: action.payload.loadedAt,
          lastHeartbeat: null,
          metrics: {}
        };
        state.metrics.loadedComponents += 1;
      })
      .addCase(loadCLMComponent.rejected, (state, action) => {
        const componentId = action.meta.arg.componentId;
        state.loading.components[componentId] = false;
        state.errors.components[componentId] = action.payload;
        state.metrics.failedComponents += 1;
      });
  }
});

// Export actions
export const {
  componentLoaded,
  componentFailed,
  componentUnloaded,
  setActiveComponent,
  clearActiveComponent,
  componentEvent,
  componentHeartbeat,
  detectFailedComponents,
  clearEvents,
  resetMetrics
} = clmSlice.actions;

// Selectors
export const selectCLMState = (state) => state.clm;
export const selectCLMRegistry = (state) => state.clm.registry;
export const selectActiveComponent = (state) => state.clm.activeComponent;
export const selectCLMComponents = (state) => state.clm.components;
export const selectCLMEvents = (state) => state.clm.events;
export const selectCLMHeartbeats = (state) => state.clm.heartbeats;
export const selectCLMMetrics = (state) => state.clm.metrics;
export const selectCLMLoading = (state) => state.clm.loading;
export const selectCLMErrors = (state) => state.clm.errors;

// Selector for component by ID
export const selectComponentById = (componentId) => (state) => 
  state.clm.components[componentId];

// Selector for components by Redux slice
export const selectComponentsBySlice = (sliceName) => (state) => 
  Object.values(state.clm.components).filter(
    comp => comp.reduxSlice === sliceName
  );

// Selector for active components
export const selectActiveComponents = (state) => 
  Object.values(state.clm.components).filter(
    comp => comp.status === 'active' || comp.status === 'loaded'
  );

// Selector for failed components
export const selectFailedComponents = (state) => 
  Object.values(state.clm.components).filter(
    comp => comp.status === 'failed' || comp.status === 'timeout'
  );

// Export reducer
export default clmSlice.reducer;
