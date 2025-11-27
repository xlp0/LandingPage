/**
 * Redux Store Configuration
 * Combines CLM and Auth slices with middleware
 */

import { configureStore } from 'https://unpkg.com/@reduxjs/toolkit@1.9.7/dist/redux-toolkit.esm.js';
import clmReducer from './slices/clm-slice.js';
import authReducer from './slices/auth-slice.js';
import clmMiddleware from './middleware/clm-middleware.js';

// Create Redux store
const store = configureStore({
  reducer: {
    // CLM slice for component management
    clm: clmReducer,
    // Auth slice for authentication management
    auth: authReducer,
    // Future slices can be added here:
    // auth: authReducer,
    // users: usersReducer,
    // ui: uiReducer,
  },
  
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serialization check
        ignoredActions: ['clm/componentEvent', 'clm/componentHeartbeat'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.timestamp', 'meta.arg'],
        // Ignore these paths in the state
        ignoredPaths: ['clm.heartbeats', 'clm.events']
      }
    }).concat(clmMiddleware),
  
  devTools: true // Enable Redux DevTools
});

// Subscribe to store changes for debugging
// Enable in development (browser environment)
const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';
if (isDevelopment) {
  store.subscribe(() => {
    const state = store.getState();
    console.log('[Redux Store] State updated:', {
      clm: {
        componentsLoaded: Object.keys(state.clm.components).length,
        eventsCount: state.clm.events.length,
        metrics: state.clm.metrics
      }
    });
  });
}

// Export store
export default store;

// Export for global access (for demo purposes)
window.__REDUX_STORE__ = store;
