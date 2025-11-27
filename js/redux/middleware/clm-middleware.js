/**
 * CLM Redux Middleware
 * Bridges CLM iframe events with Redux actions
 */

import {
  componentEvent,
  componentHeartbeat,
  componentFailed,
  detectFailedComponents
} from '../slices/clm-slice.js';

/**
 * CLM Middleware
 * Listens to postMessage events from CLM components and dispatches Redux actions
 */
export const clmMiddleware = (store) => {
  // Listen for postMessage events from iframes
  window.addEventListener('message', (event) => {
    const { type, componentId, data, timestamp, metrics, event: eventName } = event.data;
    
    switch (type) {
      case 'clm_event':
        // Dispatch component event to Redux
        store.dispatch(componentEvent({
          componentId,
          event: eventName,
          data
        }));
        
        // Broadcast to other components (simulating Redux state update)
        broadcastToComponents(event.data);
        break;
        
      case 'clm_heartbeat':
        // Dispatch heartbeat to Redux
        store.dispatch(componentHeartbeat({
          componentId,
          timestamp,
          metrics
        }));
        break;
        
      case 'clm_error':
        // Dispatch component failure to Redux
        store.dispatch(componentFailed({
          componentId,
          error: data.error
        }));
        break;
        
      default:
        // Ignore unknown message types
        break;
    }
  });
  
  // Periodically check for component timeouts
  setInterval(() => {
    store.dispatch(detectFailedComponents());
  }, 5000); // Check every 5 seconds
  
  return (next) => (action) => {
    // Pass action to next middleware
    const result = next(action);
    
    // After action is processed, broadcast state updates to components
    if (action.type.startsWith('clm/')) {
      const state = store.getState();
      broadcastStateToComponents(state);
    }
    
    return result;
  };
};

/**
 * Broadcast event to all CLM components
 */
function broadcastToComponents(eventData) {
  const iframes = document.querySelectorAll('iframe[id^="iframe-"]');
  
  iframes.forEach(iframe => {
    if (iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'redux_state_update',
        action: eventData,
        timestamp: Date.now()
      }, '*');
    }
  });
}

/**
 * Broadcast Redux state to all CLM components
 */
function broadcastStateToComponents(state) {
  const iframes = document.querySelectorAll('iframe[id^="iframe-"]');
  
  iframes.forEach(iframe => {
    if (iframe.contentWindow) {
      // Extract relevant state for each component
      const componentId = iframe.id.replace('iframe-', '');
      const component = state.clm.components[componentId];
      
      if (component && component.reduxSlice) {
        // Send only the relevant slice to the component
        iframe.contentWindow.postMessage({
          type: 'redux_state_update',
          slice: component.reduxSlice,
          state: state[component.reduxSlice] || {},
          timestamp: Date.now()
        }, '*');
      }
    }
  });
}

/**
 * Helper to get Redux store from window (for components)
 */
export function getReduxStore() {
  return window.__REDUX_STORE__;
}

/**
 * Helper to dispatch action from component
 */
export function dispatchFromComponent(action) {
  const store = getReduxStore();
  if (store) {
    store.dispatch(action);
  } else {
    console.error('[CLM Middleware] Redux store not found');
  }
}

export default clmMiddleware;
