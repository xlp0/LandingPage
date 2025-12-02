# Client-Side Component Tracking for Grafana Cloud

**Created:** 2025-12-02  
**Purpose:** Track which CLM components users visit  
**Target:** Grafana Cloud Loki  

---

## Overview

### Goal
Track user interactions with CLM components to answer:
- Which components are users visiting?
- What's the user journey through components?
- How long do users spend on each component?
- Which components are most/least popular?
- What's the conversion funnel?

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Browser                         │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Dashboard (index.html)                          │  │
│  │                                                   │  │
│  │  ┌─────────────┐  ┌─────────────┐               │  │
│  │  │ Component A │  │ Component B │               │  │
│  │  └──────┬──────┘  └──────┬──────┘               │  │
│  │         │                 │                       │  │
│  │         └────────┬────────┘                       │  │
│  │                  │                                │  │
│  │         ┌────────▼────────┐                      │  │
│  │         │ Analytics.js    │                      │  │
│  │         │ - Track visits  │                      │  │
│  │         │ - Track time    │                      │  │
│  │         │ - Send to Loki  │                      │  │
│  │         └────────┬────────┘                      │  │
│  └──────────────────┼─────────────────────────────┘  │
└───────────────────┼─────────────────────────────────┘
                    │
                    │ HTTPS POST
                    │
                    ▼
        ┌───────────────────────┐
        │   Grafana Cloud       │
        │   Loki Endpoint       │
        │   /loki/api/v1/push   │
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │   Grafana Cloud       │
        │   Dashboards          │
        │   - User Journeys     │
        │   - Component Stats   │
        │   - Heatmaps          │
        └───────────────────────┘
```

---

## Implementation Steps

### Step 1: Create Analytics Module

Create `js/analytics.js`:

```javascript
/**
 * Client-Side Analytics for CLM Component Tracking
 * Sends logs to Grafana Cloud Loki
 */

class CLMAnalytics {
    constructor(config) {
        this.lokiUrl = config.lokiUrl;
        this.userId = config.userId || this.generateUserId();
        this.sessionId = this.generateSessionId();
        this.currentComponent = null;
        this.componentStartTime = null;
        this.buffer = [];
        this.flushInterval = config.flushInterval || 5000; // 5 seconds
        
        // Start periodic flush
        setInterval(() => this.flush(), this.flushInterval);
        
        // Flush on page unload
        window.addEventListener('beforeunload', () => this.flush());
    }
    
    /**
     * Generate or retrieve user ID
     */
    generateUserId() {
        let userId = localStorage.getItem('clm_user_id');
        if (!userId) {
            userId = 'user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('clm_user_id', userId);
        }
        return userId;
    }
    
    /**
     * Generate session ID
     */
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Track component visit
     */
    trackComponentVisit(componentHash, componentName) {
        const timestamp = Date.now();
        
        // End previous component session
        if (this.currentComponent) {
            this.trackComponentExit(this.currentComponent, this.componentStartTime, timestamp);
        }
        
        // Start new component session
        this.currentComponent = {
            hash: componentHash,
            name: componentName
        };
        this.componentStartTime = timestamp;
        
        // Log component visit
        this.log({
            event: 'component_visit',
            component_hash: componentHash,
            component_name: componentName,
            timestamp: timestamp,
            user_id: this.userId,
            session_id: this.sessionId,
            url: window.location.href,
            referrer: document.referrer
        });
    }
    
    /**
     * Track component exit
     */
    trackComponentExit(component, startTime, endTime) {
        const duration = endTime - startTime;
        
        this.log({
            event: 'component_exit',
            component_hash: component.hash,
            component_name: component.name,
            duration_ms: duration,
            duration_seconds: Math.round(duration / 1000),
            timestamp: endTime,
            user_id: this.userId,
            session_id: this.sessionId
        });
    }
    
    /**
     * Track component interaction
     */
    trackInteraction(componentHash, interactionType, details = {}) {
        this.log({
            event: 'component_interaction',
            component_hash: componentHash,
            interaction_type: interactionType,
            timestamp: Date.now(),
            user_id: this.userId,
            session_id: this.sessionId,
            ...details
        });
    }
    
    /**
     * Track error
     */
    trackError(componentHash, error, context = {}) {
        this.log({
            event: 'component_error',
            component_hash: componentHash,
            error_message: error.message || error,
            error_stack: error.stack || '',
            timestamp: Date.now(),
            user_id: this.userId,
            session_id: this.sessionId,
            ...context
        });
    }
    
    /**
     * Add log to buffer
     */
    log(data) {
        this.buffer.push({
            timestamp: data.timestamp,
            data: data
        });
        
        console.log('[Analytics]', data.event, data);
        
        // Flush if buffer is large
        if (this.buffer.length >= 10) {
            this.flush();
        }
    }
    
    /**
     * Flush logs to Grafana Cloud Loki
     */
    async flush() {
        if (this.buffer.length === 0) return;
        
        const logs = this.buffer.splice(0); // Clear buffer
        
        try {
            // Format for Loki
            const streams = this.formatForLoki(logs);
            
            // Send to Loki
            await fetch(this.lokiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ streams })
            });
            
            console.log(`[Analytics] Flushed ${logs.length} logs to Loki`);
        } catch (error) {
            console.error('[Analytics] Failed to send logs:', error);
            // Put logs back in buffer
            this.buffer.unshift(...logs);
        }
    }
    
    /**
     * Format logs for Loki
     */
    formatForLoki(logs) {
        // Group logs by labels
        const streamMap = new Map();
        
        logs.forEach(({ timestamp, data }) => {
            // Create label set
            const labels = {
                job: 'clm-frontend',
                event: data.event,
                component: data.component_hash || 'unknown',
                user_id: data.user_id,
                session_id: data.session_id
            };
            
            const labelKey = JSON.stringify(labels);
            
            if (!streamMap.has(labelKey)) {
                streamMap.set(labelKey, {
                    stream: labels,
                    values: []
                });
            }
            
            // Add log entry [timestamp_ns, log_line]
            streamMap.get(labelKey).values.push([
                String(timestamp * 1000000), // Convert to nanoseconds
                JSON.stringify(data)
            ]);
        });
        
        return Array.from(streamMap.values());
    }
}

// Export for use
window.CLMAnalytics = CLMAnalytics;
```

---

### Step 2: Integrate with Dashboard

Update `index.html` to track component visits:

```javascript
// Initialize analytics
const analytics = new CLMAnalytics({
    lokiUrl: 'https://logs-prod-us-central1.grafana.net/loki/api/v1/push',
    // You'll need to add authentication headers
    flushInterval: 5000
});

// Track component visits in Redux middleware
const analyticsMiddleware = store => next => action => {
    const result = next(action);
    
    // Track component switches
    if (action.type === 'clm/setActiveComponent') {
        const state = store.getState();
        const component = state.clm.registry.components.find(
            c => c.hash === action.payload
        );
        
        if (component) {
            analytics.trackComponentVisit(
                component.hash,
                component.name
            );
        }
    }
    
    // Track component load success
    if (action.type === 'clm/componentLoaded') {
        const component = action.payload;
        analytics.trackInteraction(
            component.hash,
            'component_loaded',
            {
                load_time_ms: component.loadTime
            }
        );
    }
    
    // Track component errors
    if (action.type === 'clm/componentFailed') {
        const { hash, error } = action.payload;
        analytics.trackError(hash, error);
    }
    
    return result;
};

// Add to Redux store
const store = configureStore({
    reducer: {
        clm: clmReducer
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(analyticsMiddleware)
});
```

---

### Step 3: Set Up Grafana Cloud

#### 3.1 Create Grafana Cloud Account

1. Go to https://grafana.com/auth/sign-up/create-user
2. Sign up for free tier (includes Loki)
3. Create a stack (e.g., "thkmesh-observability")

#### 3.2 Get Loki Credentials

1. In Grafana Cloud, go to **Connections** → **Add new connection**
2. Select **Loki**
3. Copy your Loki endpoint URL:
   ```
   https://logs-prod-us-central1.grafana.net/loki/api/v1/push
   ```
4. Create an API token:
   - Go to **Security** → **API Keys**
   - Create key with **MetricsPublisher** role
   - Copy the key (you'll need this)

#### 3.3 Update Analytics Configuration

```javascript
const analytics = new CLMAnalytics({
    lokiUrl: 'https://logs-prod-us-central1.grafana.net/loki/api/v1/push',
    lokiUsername: 'YOUR_INSTANCE_ID', // e.g., 123456
    lokiPassword: 'YOUR_API_KEY',     // API key from step 3.2
    flushInterval: 5000
});
```

Update the `flush()` method to include authentication:

```javascript
async flush() {
    if (this.buffer.length === 0) return;
    
    const logs = this.buffer.splice(0);
    
    try {
        const streams = this.formatForLoki(logs);
        
        // Basic auth for Grafana Cloud
        const auth = btoa(`${this.lokiUsername}:${this.lokiPassword}`);
        
        await fetch(this.lokiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            body: JSON.stringify({ streams })
        });
        
        console.log(`[Analytics] Flushed ${logs.length} logs to Grafana Cloud`);
    } catch (error) {
        console.error('[Analytics] Failed to send logs:', error);
        this.buffer.unshift(...logs);
    }
}
```

---

### Step 4: Create Grafana Dashboards

#### Dashboard 1: Component Visit Analytics

**Panels:**

1. **Total Component Visits (Last 24h)**
   ```logql
   count_over_time({job="clm-frontend", event="component_visit"} [24h])
   ```

2. **Visits by Component**
   ```logql
   sum by (component) (count_over_time({job="clm-frontend", event="component_visit"} [24h]))
   ```

3. **User Journey (Sankey Diagram)**
   ```logql
   {job="clm-frontend", event="component_visit"} 
   | json 
   | line_format "{{.user_id}}: {{.component_name}}"
   ```

4. **Average Time per Component**
   ```logql
   avg by (component) (
     avg_over_time({job="clm-frontend", event="component_exit"} 
     | json 
     | unwrap duration_seconds [24h])
   )
   ```

5. **Active Users (Last Hour)**
   ```logql
   count(count by (user_id) ({job="clm-frontend", event="component_visit"} [1h]))
   ```

6. **Component Visit Timeline**
   ```logql
   rate({job="clm-frontend", event="component_visit"} [5m])
   ```

#### Dashboard 2: User Behavior

**Panels:**

1. **Session Duration**
   ```logql
   histogram_quantile(0.95, 
     sum by (le) (
       rate({job="clm-frontend", event="component_exit"} 
       | json 
       | unwrap duration_seconds [1h])
     )
   )
   ```

2. **Bounce Rate** (users who visit only 1 component)
   ```logql
   count(count by (session_id) ({job="clm-frontend", event="component_visit"}) == 1) 
   / 
   count(count by (session_id) ({job="clm-frontend", event="component_visit"}))
   ```

3. **Most Common Entry Points**
   ```logql
   topk(5, 
     sum by (component_name) (
       count_over_time({job="clm-frontend", event="component_visit"} 
       | json 
       | referrer =~ ".*" [24h])
     )
   )
   ```

4. **User Flow Heatmap**
   - Use Grafana's Flow diagram
   - Source: component visits
   - Target: next component visit

---

## Alternative: Server-Side Tracking

If you prefer server-side tracking (more reliable), update `ws-server.js`:

```javascript
// ws-server.js
const express = require('express');
const app = express();

// Middleware to log component requests
app.use((req, res, next) => {
    // Log all requests
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'http_request',
        method: req.method,
        path: req.path,
        user_agent: req.get('user-agent'),
        ip: req.ip,
        referrer: req.get('referrer')
    }));
    
    next();
});

// Endpoint to receive client-side analytics
app.post('/api/analytics', express.json(), (req, res) => {
    const { event, component, data } = req.body;
    
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: event,
        component: component,
        user_id: data.user_id,
        session_id: data.session_id,
        ...data
    }));
    
    res.status(200).json({ success: true });
});
```

Then configure Promtail to ship these logs to Grafana Cloud.

---

## Testing

### Test Component Tracking

1. Open browser console
2. Navigate between components
3. Check console for analytics logs:
   ```
   [Analytics] component_visit {component_hash: "pkc-viewer", ...}
   [Analytics] component_exit {duration_seconds: 15, ...}
   [Analytics] Flushed 2 logs to Grafana Cloud
   ```

4. In Grafana Cloud, go to **Explore**
5. Query:
   ```logql
   {job="clm-frontend", event="component_visit"}
   ```

6. You should see your component visits!

---

## Privacy Considerations

### GDPR Compliance

1. **User Consent**
   ```javascript
   // Check for consent before tracking
   if (localStorage.getItem('analytics_consent') === 'true') {
       analytics.trackComponentVisit(hash, name);
   }
   ```

2. **Anonymization**
   ```javascript
   // Hash user IDs
   generateUserId() {
       const rawId = 'user_' + Math.random().toString(36).substr(2, 9);
       return this.hashUserId(rawId);
   }
   
   hashUserId(id) {
       // Use SHA-256 or similar
       return crypto.subtle.digest('SHA-256', new TextEncoder().encode(id));
   }
   ```

3. **Data Retention**
   - Set Loki retention to 30 days
   - Provide user data deletion endpoint

---

## Cost Estimation

### Grafana Cloud Free Tier

- **Logs:** 50GB/month
- **Metrics:** 10k series
- **Traces:** 50GB/month

### Estimated Usage

Assuming:
- 1000 users/day
- 10 component visits per user
- 500 bytes per log entry

**Daily:** 1000 × 10 × 500 bytes = 5MB  
**Monthly:** 5MB × 30 = 150MB

✅ **Well within free tier!**

---

## Next Steps

1. [ ] Create `js/analytics.js` file
2. [ ] Sign up for Grafana Cloud
3. [ ] Get Loki credentials
4. [ ] Integrate analytics into dashboard
5. [ ] Test component tracking
6. [ ] Create Grafana dashboards
7. [ ] Set up alerts (optional)

---

## Summary

With this setup, you'll be able to:

✅ Track which components users visit  
✅ See user journey through components  
✅ Measure time spent on each component  
✅ Identify popular/unpopular components  
✅ Detect errors and issues  
✅ Visualize everything in Grafana Cloud  

**All within Grafana Cloud's free tier!** 🎉
