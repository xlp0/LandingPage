# Grafana Faro Troubleshooting Guide

## 🔍 **Your Situation**

✅ **Console logs show TikZ tracking is working**
```
[PKC Viewer] TikZ render complete: {
  container: 'tikz-0',
  totalTime: '27725.40ms',
  iframeRenderTime: '24685.80ms',
  codeLength: 52
}
```

❌ **But data not showing in Grafana Faro dashboard**

---

## 🎯 **The Issue**

The **Faro App dashboard** (`/a/grafana-kowalski-app/apps/81/overview`) shows **automatic metrics** like:
- Page loads
- Web vitals (LCP, FID, CLS)
- JavaScript errors
- User sessions

But **custom events** (like `tikz_render_complete`) go to **Loki logs**, not the Faro app!

---

## ✅ **Solution: Use Grafana Explore (Loki)**

### **Step 1: Go to Explore**
```
https://lckoo1230.grafana.net/explore
```

### **Step 2: Select Loki Data Source**
**Top left dropdown:**
- Select: `grafanacloud-lckoo1230-logs` (Loki)
- NOT "Faro" or "Prometheus"

### **Step 3: Query Your TikZ Events**

#### **Start Simple:**
```logql
{app="THK Mesh Landing Page"}
```
**This shows ALL logs from your app**

#### **Then Filter to TikZ:**
```logql
{app="THK Mesh Landing Page"} | json | event_name =~ "tikz_.*"
```

#### **Show Render Times:**
```logql
{app="THK Mesh Landing Page"} 
| json 
| event_name = "tikz_render_complete"
| line_format "{{.container_id}}: {{.total_time_ms}}ms ({{.code_length}} chars)"
```

### **Step 4: Check Time Range**
**Top right corner:**
- Click time picker
- Select "Last 15 minutes"
- Click "Run query"

---

## 🔍 **Debug Steps**

### **1. Check if Faro is Initialized**

**Open Console (F12):**
```javascript
console.log(window.faro);
```

**Expected:**
```javascript
{
  api: { pushEvent: ƒ, pushError: ƒ, pushMeasurement: ƒ, ... },
  config: { ... },
  ...
}
```

**If `undefined`:** Faro didn't load! Check `index.html`.

---

### **2. Check Network Requests**

**Open Network Tab (F12 → Network):**

1. **Filter by "collect"**
2. **Reload page and load TikZ diagrams**
3. **Look for POST requests to:**
   ```
   faro-collector-prod-ap-southeast-2.grafana.net/collect/2a49694fa859f4189869a5157f39c44d
   ```

4. **Click on a request → Preview tab**

**Expected payload:**
```json
{
  "events": [
    {
      "name": "tikz_render_complete",
      "domain": "browser",
      "attributes": {
        "container_id": "tikz-0",
        "total_time_ms": 27725,
        "iframe_render_time_ms": 24685,
        "code_length": 52,
        "svg_height": 100,
        "svg_width": 100,
        "timestamp": 1701518400000
      },
      "timestamp": "2024-12-03T01:40:00.000Z"
    }
  ],
  "meta": {
    "app": {
      "name": "THK Mesh Landing Page",
      "version": "1.0.0",
      "environment": "production"
    },
    "session": { ... },
    "page": { ... }
  }
}
```

**If you see this:** ✅ Faro is sending data!

**If Status is 200 OK:** ✅ Grafana received it!

**If Status is 4xx/5xx:** ❌ Problem with collector

---

### **3. Manually Test Event**

**In Console (F12):**
```javascript
// Send a test event
window.faro.api.pushEvent('manual_test', {
  test_field: 'hello_world',
  timestamp: Date.now()
});

console.log('Test event sent!');
```

**Then check Grafana Explore (wait 1-2 min):**
```logql
{app="THK Mesh Landing Page"} | json | event_name = "manual_test"
```

**If you see it:** ✅ Faro is working!

---

### **4. Check Faro Initialization in index.html**

**File:** `/Users/Henrykoo/Documents/GovTech/THKMesh/LandingPage/index.html`

**Should have:**
```html
<!-- Grafana Faro SDK -->
<script src="https://unpkg.com/@grafana/faro-web-sdk@^1.3.0/dist/bundle/faro-web-sdk.iife.js"></script>

<script>
  // Initialize Faro
  const faro = window.GrafanaFaroWebSdk.initializeFaro({
    url: 'https://faro-collector-prod-ap-southeast-2.grafana.net/collect/2a49694fa859f4189869a5157f39c44d',
    app: {
      name: 'THK Mesh Landing Page',
      version: '1.0.0',
      environment: 'production'
    }
  });
  
  window.faro = faro;
  console.log('[Faro] ✓ Initialized successfully');
</script>
```

---

## 📊 **Understanding the Data Flow**

```
┌─────────────────────────────────────────┐
│ Browser (henry.pkc.pub)                 │
│                                         │
│ 1. TikZ renders                         │
│ 2. window.faro.api.pushEvent(...)      │
│    └─> Creates event object             │
│                                         │
│ 3. Faro SDK batches events              │
│    └─> Every few seconds                │
│                                         │
│ 4. POST to Faro Collector               │
│    └─> faro-collector-prod-...         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Grafana Cloud                           │
│                                         │
│ 5. Faro Collector receives              │
│    └─> Validates & processes            │
│                                         │
│ 6. Writes to Loki (logs)                │
│    └─> Label: app="THK Mesh..."        │
│                                         │
│ 7. Available in Explore                 │
│    └─> Query with LogQL                 │
└─────────────────────────────────────────┘
```

**Delay:** 30 seconds - 2 minutes from event to Grafana

---

## 🎯 **Common Issues & Solutions**

### **Issue 1: "I don't see any data in Grafana"**

**Checklist:**
- [ ] Wait 2 minutes after testing
- [ ] Use Explore, not Faro app dashboard
- [ ] Select `grafanacloud-lckoo1230-logs` data source
- [ ] Check time range (last 15 min)
- [ ] Verify Faro initialized (`window.faro`)
- [ ] Check network requests (POST to collector)

---

### **Issue 2: "window.faro is undefined"**

**Cause:** Faro SDK didn't load

**Solutions:**
1. Check `index.html` has Faro script tag
2. Check browser console for script loading errors
3. Check network tab for failed script loads
4. Try hard refresh (Cmd+Shift+R)

---

### **Issue 3: "Network requests fail (4xx/5xx)"**

**Cause:** Wrong collector URL or CORS issue

**Solutions:**
1. Verify collector URL in `index.html`
2. Check Faro app settings in Grafana Cloud
3. Regenerate collector URL if needed

---

### **Issue 4: "Data in Explore but not Faro dashboard"**

**This is NORMAL!**

**Faro App Dashboard shows:**
- ✅ Page loads
- ✅ Web vitals
- ✅ JavaScript errors
- ✅ User sessions

**Custom events (tikz_render_complete) show in:**
- ✅ Explore (Loki)
- ✅ Custom dashboards

**Solution:** Create a custom dashboard with your TikZ metrics!

---

## 📊 **Create Your TikZ Dashboard**

### **Step 1: New Dashboard**
```
https://lckoo1230.grafana.net/dashboard/new
```

### **Step 2: Add Panel**

**Panel 1: Render Time (Time Series)**

**Query:**
```logql
{app="THK Mesh Landing Page"} 
| json 
| event_name = "tikz_render_complete" 
| unwrap total_time_ms
```

**Visualization:** Time series
**Title:** "TikZ Render Time"

---

**Panel 2: Average Time (Stat)**

**Query:**
```logql
avg_over_time(
  {app="THK Mesh Landing Page"} 
  | json 
  | event_name = "tikz_render_complete" 
  | unwrap total_time_ms [15m]
)
```

**Visualization:** Stat
**Unit:** milliseconds
**Title:** "Avg Render Time"

---

**Panel 3: Render Count (Stat)**

**Query:**
```logql
count_over_time(
  {app="THK Mesh Landing Page"} 
  | json 
  | event_name = "tikz_render_complete" [15m]
)
```

**Visualization:** Stat
**Title:** "Total Renders"

---

**Panel 4: Details (Table)**

**Query:**
```logql
{app="THK Mesh Landing Page"} 
| json 
| event_name = "tikz_render_complete"
```

**Visualization:** Table
**Columns:** container_id, total_time_ms, code_length
**Title:** "Render Details"

---

## 🎯 **Your Specific Data**

Based on your console logs:

### **What You Should See:**

**Render times:** ~27,000ms (27 seconds)
**Iframe times:** ~24,700ms (24.7 seconds)
**Code lengths:** 52 - 642 characters

**Containers:** tikz-0 through tikz-19 (20 diagrams)

### **Query to Find Your Data:**

```logql
{app="THK Mesh Landing Page"} 
| json 
| event_name = "tikz_render_complete"
| total_time_ms > 20000
| line_format "{{.container_id}}: {{.total_time_ms}}ms ({{.code_length}} chars)"
```

**This will show all renders over 20 seconds (which is all of yours!)**

---

## 📚 **Quick Reference**

### **URLs:**
- **Explore:** https://lckoo1230.grafana.net/explore
- **New Dashboard:** https://lckoo1230.grafana.net/dashboard/new
- **Faro App:** https://lckoo1230.grafana.net/a/grafana-kowalski-app/apps/81/overview

### **Data Source:**
- **Name:** `grafanacloud-lckoo1230-logs`
- **Type:** Loki

### **Label:**
- **App:** `app="THK Mesh Landing Page"`

### **Event Names:**
- `tikz_render_start`
- `tikz_render_complete`
- `tikz_render_error`

---

## ✅ **Summary**

1. ✅ **Your tracking is working** (console logs prove it)
2. ✅ **Faro is sending events** (check network tab)
3. ❌ **You're looking in the wrong place** (Faro app vs Explore)
4. ✅ **Use Explore with Loki** (grafanacloud-lckoo1230-logs)
5. ✅ **Create custom dashboard** (for TikZ metrics)

**The data is there, you just need to query it correctly!** 🎉
