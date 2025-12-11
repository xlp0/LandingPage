# Grafana Cloud Setup Steps

**Your Grafana Instance:** https://lckoo1230.grafana.net  
**Created:** 2025-12-02  
**Purpose:** Track CLM component visits and user behavior

---

## Step-by-Step Setup Guide

### Step 1: Set Up Frontend Observability (Faro)

#### 1.1 Navigate to Frontend Observability
1. In your Grafana Cloud dashboard: https://lckoo1230.grafana.net
2. Click on **"Frontend Observability"** in the left sidebar
   - Or go to: https://lckoo1230.grafana.net/a/grafana-frontend-observability-app
3. Click **"Create new app"**

#### 1.2 Create Your App
Fill in the details:
- **App Name:** `THK Mesh Landing Page`
- **Environment:** `production` (or `development` for testing)
- **Description:** `Real user monitoring for THK Mesh CLM components`

Click **"Create"**

#### 1.3 Get Your Faro Endpoint
After creating the app, you'll see:
```
Faro Collector URL:
https://faro-collector-prod-us-central-0.grafana.net/collect/YOUR_APP_KEY
```

**Copy this URL!** You'll need it in the next step.

---

### Step 2: Install Faro in Your Application

#### 2.1 Add Faro SDK via CDN

Open `/Users/Henrykoo/Documents/GovTech/THKMesh/LandingPage/index.html` and add this **before the closing `</body>` tag**:

```html
<!-- Grafana Faro Web SDK -->
<script src="https://unpkg.com/@grafana/faro-web-sdk@^1.3.0/dist/bundle/faro-web-sdk.iife.js"></script>
<script>
    // Initialize Faro
    const faro = window.GrafanaFaroWebSdk.initializeFaro({
        url: 'YOUR_FARO_COLLECTOR_URL', // Replace with your actual URL from Step 1.3
        app: {
            name: 'THK Mesh Landing Page',
            version: '1.0.0',
            environment: 'production'
        },
        instrumentations: [
            // Automatic instrumentation
            ...window.GrafanaFaroWebSdk.getWebInstrumentations({
                captureConsole: true,
                captureConsoleDisabledLevels: []
            })
        ]
    });

    console.log('[Faro] Initialized successfully');
</script>
```

#### 2.2 Track CLM Component Visits

Add this Redux middleware to track component navigation:

```javascript
// Add this to your Redux store setup in index.html
const faroMiddleware = store => next => action => {
    const result = next(action);
    
    // Track component switches
    if (action.type === 'clm/setActiveComponent') {
        const state = store.getState();
        const component = state.clm.registry.components.find(
            c => c.hash === action.payload
        );
        
        if (component && window.faro) {
            window.faro.api.pushEvent('clm_component_visit', {
                component_hash: component.hash,
                component_name: component.name,
                timestamp: Date.now(),
                user_agent: navigator.userAgent,
                screen_width: window.innerWidth,
                screen_height: window.innerHeight
            });
            
            console.log('[Faro] Tracked component visit:', component.name);
        }
    }
    
    // Track component load success
    if (action.type === 'clm/componentLoaded') {
        const { hash, loadTime } = action.payload;
        if (window.faro) {
            window.faro.api.pushEvent('clm_component_loaded', {
                component_hash: hash,
                load_time_ms: loadTime,
                timestamp: Date.now()
            });
        }
    }
    
    // Track component errors
    if (action.type === 'clm/componentFailed') {
        const { hash, error } = action.payload;
        if (window.faro) {
            window.faro.api.pushError(new Error(`Component ${hash} failed: ${error}`), {
                context: {
                    component_hash: hash,
                    error_type: 'component_load_failure'
                }
            });
        }
    }
    
    return result;
};

// Add middleware to your store
const store = configureStore({
    reducer: {
        clm: clmReducer
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(faroMiddleware)
});
```

---

### Step 3: Set Up Loki for Logs (Optional but Recommended)

#### 3.1 Get Loki Credentials
1. In Grafana Cloud: https://lckoo1230.grafana.net
2. Go to **"Connections"** → **"Add new connection"**
3. Search for **"Loki"**
4. Click **"Add new data source"**
5. You'll see:
   ```
   URL: https://logs-prod-us-central1.grafana.net
   User: YOUR_INSTANCE_ID (e.g., 123456)
   ```

#### 3.2 Create API Token
1. Go to **"Administration"** → **"Service Accounts"**
2. Click **"Add service account"**
3. Name: `Faro Logs`
4. Role: **MetricsPublisher**
5. Click **"Create"**
6. Click **"Add service account token"**
7. **Copy the token** (you won't see it again!)

#### 3.3 Configure Faro to Send Logs to Loki

Update your Faro initialization:

```javascript
const faro = window.GrafanaFaroWebSdk.initializeFaro({
    url: 'YOUR_FARO_COLLECTOR_URL',
    app: {
        name: 'THK Mesh Landing Page',
        version: '1.0.0',
        environment: 'production'
    },
    instrumentations: [
        ...window.GrafanaFaroWebSdk.getWebInstrumentations({
            captureConsole: true,
            captureConsoleDisabledLevels: []
        })
    ],
    // Optional: Send logs to Loki
    transports: [
        new window.GrafanaFaroWebSdk.FetchTransport({
            url: 'YOUR_FARO_COLLECTOR_URL',
            apiKey: 'YOUR_API_TOKEN' // Optional, if using authentication
        })
    ]
});
```

---

### Step 4: Create Dashboards

#### 4.1 Navigate to Dashboards
1. Go to: https://lckoo1230.grafana.net/dashboards
2. Click **"New"** → **"New Dashboard"**
3. Click **"Add visualization"**

#### 4.2 Dashboard 1: Component Visit Analytics

**Panel 1: Total Component Visits**
- Visualization: **Stat**
- Query:
```
{app="THK Mesh Landing Page", event_name="clm_component_visit"}
| count_over_time([24h])
```

**Panel 2: Visits by Component (Bar Chart)**
- Visualization: **Bar chart**
- Query:
```
sum by (component_name) (
    count_over_time({app="THK Mesh Landing Page", event_name="clm_component_visit"} [24h])
)
```

**Panel 3: User Journey (Table)**
- Visualization: **Table**
- Query:
```
{app="THK Mesh Landing Page", event_name="clm_component_visit"}
| json
| line_format "{{.component_name}}"
```

**Panel 4: Component Load Times**
- Visualization: **Time series**
- Query:
```
avg by (component_hash) (
    avg_over_time({app="THK Mesh Landing Page", event_name="clm_component_loaded"} 
    | json 
    | unwrap load_time_ms [5m])
)
```

#### 4.3 Dashboard 2: Error Tracking

**Panel 1: Error Count**
- Visualization: **Stat**
- Query:
```
count_over_time({app="THK Mesh Landing Page", kind="exception"} [24h])
```

**Panel 2: Errors by Component**
- Visualization: **Pie chart**
- Query:
```
sum by (component_hash) (
    count_over_time({app="THK Mesh Landing Page", kind="exception"} [24h])
)
```

**Panel 3: Error Log**
- Visualization: **Logs**
- Query:
```
{app="THK Mesh Landing Page", kind="exception"}
```

#### 4.4 Save Your Dashboard
1. Click **"Save dashboard"** (disk icon in top right)
2. Name: `CLM Component Analytics`
3. Click **"Save"**

---

### Step 5: Set Up Alerts (Optional)

#### 5.1 Create Alert Rule
1. Go to **"Alerting"** → **"Alert rules"**
2. Click **"New alert rule"**

#### 5.2 Example Alert: High Error Rate
- **Alert name:** `High Component Error Rate`
- **Query:**
```
rate({app="THK Mesh Landing Page", kind="exception"} [5m]) > 0.1
```
- **Condition:** `When query returns more than 0.1`
- **Evaluate every:** `1m`
- **For:** `5m`

#### 5.3 Set Up Notification Channel
1. Go to **"Alerting"** → **"Contact points"**
2. Click **"New contact point"**
3. Choose:
   - **Email** (enter your email)
   - **Slack** (connect your workspace)
   - **Webhook** (for custom integrations)

---

### Step 6: Test Your Setup

#### 6.1 Test Faro Integration
1. Open your application: http://localhost:3000
2. Navigate between different CLM components
3. Open browser console and look for:
   ```
   [Faro] Initialized successfully
   [Faro] Tracked component visit: PKC Document Viewer
   ```

#### 6.2 Verify Data in Grafana
1. Go to **"Explore"** in Grafana: https://lckoo1230.grafana.net/explore
2. Select **"Faro"** as data source
3. Query:
   ```
   {app="THK Mesh Landing Page"}
   ```
4. You should see your events!

#### 6.3 Check Dashboard
1. Go to your dashboard: https://lckoo1230.grafana.net/dashboards
2. Open **"CLM Component Analytics"**
3. You should see:
   - Component visit counts
   - User journey
   - Load times
   - Errors (hopefully none!)

---

## Quick Reference

### Your Grafana URLs

| Resource | URL |
|----------|-----|
| **Main Dashboard** | https://lckoo1230.grafana.net |
| **Frontend Observability** | https://lckoo1230.grafana.net/a/grafana-frontend-observability-app |
| **Explore (Query)** | https://lckoo1230.grafana.net/explore |
| **Dashboards** | https://lckoo1230.grafana.net/dashboards |
| **Alerting** | https://lckoo1230.grafana.net/alerting |

### Common Queries

**All component visits:**
```
{app="THK Mesh Landing Page", event_name="clm_component_visit"}
```

**Visits by component:**
```
sum by (component_name) (count_over_time({app="THK Mesh Landing Page", event_name="clm_component_visit"} [24h]))
```

**Average load time:**
```
avg(avg_over_time({app="THK Mesh Landing Page", event_name="clm_component_loaded"} | json | unwrap load_time_ms [1h]))
```

**All errors:**
```
{app="THK Mesh Landing Page", kind="exception"}
```

---

## Troubleshooting

### Issue: No data showing in Grafana

**Check:**
1. Is Faro initialized? Check browser console for `[Faro] Initialized successfully`
2. Is the Faro URL correct? Check network tab for requests to `faro-collector`
3. Wait 1-2 minutes - data ingestion has a slight delay

### Issue: Events not tracked

**Check:**
1. Is the Redux middleware added?
2. Are component navigation actions firing? Check Redux DevTools
3. Is `window.faro` defined? Check browser console: `console.log(window.faro)`

### Issue: Queries return no results

**Check:**
1. Time range - set to "Last 24 hours" or "Last 1 hour"
2. App name matches exactly: `app="THK Mesh Landing Page"`
3. Event name matches: `event_name="clm_component_visit"`

---

## Next Steps

1. ✅ Complete Step 1: Set up Frontend Observability
2. ✅ Complete Step 2: Install Faro SDK
3. ✅ Complete Step 3: Test integration
4. ✅ Complete Step 4: Create dashboards
5. ⏳ Complete Step 5: Set up alerts (optional)
6. ⏳ Share dashboards with team

---

## Cost & Limits

**Your Free Tier Includes:**
- ✅ 15,000 frontend sessions/month
- ✅ 50GB logs/month
- ✅ 10,000 metrics series
- ✅ 50GB traces/month
- ✅ Unlimited dashboards
- ✅ 14-day data retention

**If you exceed:**
- Upgrade to **Pro** ($49/month) for 50k sessions
- Or optimize tracking (sample users, reduce events)

---

**Ready to start tracking!** 🚀

Follow the steps above and you'll have full observability of your CLM components in minutes!
