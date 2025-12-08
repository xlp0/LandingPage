/**
 * Redux Store Configuration
 * Combines CLM and Auth slices with middleware
 */

import { configureStore } from '@reduxjs/toolkit';
import clmReducer from './slices/clm-slice.js';
import authReducer from './slices/auth-slice.js';
import cubicModelsReducer from './slices/cubic-models-slice.js';
import contentRendererReducer from './slices/content-renderer-slice.js';
import clmMiddleware from './middleware/clm-middleware.js';

// Create Redux store
const store = configureStore({
  reducer: {
    // CLM slice for component management
    clm: clmReducer,
    // Auth slice for authentication management
    auth: authReducer,
    // Cubic Models slice for CLM logic (三套東西: Context, Goal, Success)
    cubicModels: cubicModelsReducer,
    // Content Renderer slice for MCard content rendering
    contentRenderer: contentRendererReducer,
    // Future slices can be added here:
    // users: usersReducer,
    // ui: uiReducer,
  },
  
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Disable ALL development-only middleware that requires Node.js process
      immutableCheck: false,
      serializableCheck: false,
      actionCreatorCheck: false
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
