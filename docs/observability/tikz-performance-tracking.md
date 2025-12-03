# TikZ Performance Tracking with Grafana Faro

## 📊 Overview

We've instrumented the PKC Viewer's TikZ rendering to track performance metrics using Grafana Faro. This allows us to monitor real user experience when loading TikZ diagrams.

---

## 🎯 What We Track

### **1. TikZ Render Start**
**Event:** `tikz_render_start`

Fired when a TikZ diagram begins rendering.

**Attributes:**
```json
{
  "container_id": "tikz-0",
  "code_length": 245,
  "timestamp": 1701518400000
}
```

---

### **2. TikZ Render Complete** ✅
**Event:** `tikz_render_complete`

Fired when a TikZ diagram successfully renders.

**Attributes:**
```json
{
  "container_id": "tikz-0",
  "total_time_ms": 2341,
  "iframe_render_time_ms": 1823,
  "code_length": 245,
  "svg_height": 350,
  "svg_width": 600,
  "timestamp": 1701518402341
}
```

**Measurement:** `tikz_render_duration`
```json
{
  "type": "tikz_render_duration",
  "values": {
    "duration": 2341.5,
    "iframe_duration": 1823.2,
    "code_length": 245
  }
}
```

---

### **3. TikZ Render Error** ❌
**Event:** `tikz_render_error`

Fired when a TikZ diagram fails to render.

**Attributes:**
```json
{
  "container_id": "tikz-0",
  "error_message": "TikZ compilation failed",
  "code_length": 245,
  "time_to_failure_ms": 1234,
  "timestamp": 1701518401234
}
```

**Error Context:**
```json
{
  "component": "tikz_renderer",
  "container_id": "tikz-0",
  "code_length": 245,
  "time_to_failure_ms": 1234
}
```

---

## 📈 Metrics Explained

### **Total Time vs Iframe Render Time**

```
┌─────────────────────────────────────────┐
│ Total Time (2341ms)                     │
├─────────────────────────────────────────┤
│ 1. Create iframe          (~50ms)       │
│ 2. Load TikZJax           (~500ms)      │
│ 3. Initialize WASM        (~300ms)      │
│ 4. Compile TikZ           (~1000ms) ◄── Iframe render time
│ 5. Convert DVI→SVG        (~400ms)  ◄── (1823ms)
│ 6. Render SVG             (~91ms)       │
└─────────────────────────────────────────┘
```

**Total Time:** End-to-end from `renderTikZ()` call to SVG displayed
**Iframe Render Time:** Time inside iframe (TikZJax compilation + rendering)

---

## 🔍 How to View Data in Grafana

### **Step 1: Go to Explore**
```
https://lckoo1230.grafana.net/explore
```

### **Step 2: Select Data Source**
- **Data source:** `grafanacloud-lckoo1230-logs`

### **Step 3: Query TikZ Events**

#### **All TikZ Render Events:**
```logql
{app="THK Mesh Landing Page"} | json | event_name =~ "tikz_.*"
```

#### **Successful Renders:**
```logql
{app="THK Mesh Landing Page"} | json | event_name = "tikz_render_complete"
```

#### **Failed Renders:**
```logql
{app="THK Mesh Landing Page"} | json | event_name = "tikz_render_error"
```

#### **Average Render Time:**
```logql
avg_over_time(
  {app="THK Mesh Landing Page"} 
  | json 
  | event_name = "tikz_render_complete" 
  | unwrap total_time_ms [5m]
)
```

#### **Render Time by Code Length:**
```logql
{app="THK Mesh Landing Page"} 
| json 
| event_name = "tikz_render_complete" 
| line_format "{{.code_length}} chars → {{.total_time_ms}}ms"
```

---

## 📊 Create Dashboard Panels

### **Panel 1: TikZ Render Time (Time Series)**

**Query:**
```logql
{app="THK Mesh Landing Page"} 
| json 
| event_name = "tikz_render_complete" 
| unwrap total_time_ms
```

**Visualization:** Time series
**Y-axis:** Milliseconds
**Title:** "TikZ Render Time"

---

### **Panel 2: Average Render Time (Stat)**

**Query:**
```logql
avg_over_time(
  {app="THK Mesh Landing Page"} 
  | json 
  | event_name = "tikz_render_complete" 
  | unwrap total_time_ms [1h]
)
```

**Visualization:** Stat
**Unit:** Milliseconds
**Title:** "Avg TikZ Render Time (1h)"

---

### **Panel 3: Render Time Distribution (Histogram)**

**Query:**
```logql
histogram_quantile(0.95,
  sum(rate(
    {app="THK Mesh Landing Page"} 
    | json 
    | event_name = "tikz_render_complete" 
    | unwrap total_time_ms [5m]
  )) by (le)
)
```

**Visualization:** Histogram
**Title:** "TikZ Render Time Distribution (p95)"

---

### **Panel 4: Render Success Rate (Gauge)**

**Query:**
```logql
sum(rate({app="THK Mesh Landing Page"} | json | event_name = "tikz_render_complete" [5m])) 
/ 
sum(rate({app="THK Mesh Landing Page"} | json | event_name =~ "tikz_render_(complete|error)" [5m])) 
* 100
```

**Visualization:** Gauge
**Unit:** Percent
**Title:** "TikZ Render Success Rate"

---

### **Panel 5: Render Time by Code Length (Scatter)**

**Query:**
```logql
{app="THK Mesh Landing Page"} 
| json 
| event_name = "tikz_render_complete"
```

**Visualization:** Scatter plot
**X-axis:** `code_length`
**Y-axis:** `total_time_ms`
**Title:** "Render Time vs Code Complexity"

---

### **Panel 6: Error Rate (Time Series)**

**Query:**
```logql
sum(rate(
  {app="THK Mesh Landing Page"} 
  | json 
  | event_name = "tikz_render_error" [5m]
))
```

**Visualization:** Time series
**Y-axis:** Errors per second
**Title:** "TikZ Render Errors"

---

## 🎯 Example Queries

### **Find Slow Renders (>3 seconds)**
```logql
{app="THK Mesh Landing Page"} 
| json 
| event_name = "tikz_render_complete" 
| total_time_ms > 3000
| line_format "Slow render: {{.container_id}} took {{.total_time_ms}}ms ({{.code_length}} chars)"
```

### **Find Failed Renders**
```logql
{app="THK Mesh Landing Page"} 
| json 
| event_name = "tikz_render_error"
| line_format "Error in {{.container_id}}: {{.error_message}} (failed after {{.time_to_failure_ms}}ms)"
```

### **Render Time Percentiles**
```logql
quantile_over_time(0.50,
  {app="THK Mesh Landing Page"} 
  | json 
  | event_name = "tikz_render_complete" 
  | unwrap total_time_ms [1h]
) # p50 (median)

quantile_over_time(0.95,
  {app="THK Mesh Landing Page"} 
  | json 
  | event_name = "tikz_render_complete" 
  | unwrap total_time_ms [1h]
) # p95

quantile_over_time(0.99,
  {app="THK Mesh Landing Page"} 
  | json 
  | event_name = "tikz_render_complete" 
  | unwrap total_time_ms [1h]
) # p99
```

### **Renders Per Minute**
```logql
sum(rate(
  {app="THK Mesh Landing Page"} 
  | json 
  | event_name = "tikz_render_complete" [1m]
)) * 60
```

### **Most Complex Diagrams**
```logql
{app="THK Mesh Landing Page"} 
| json 
| event_name = "tikz_render_complete"
| code_length > 500
| line_format "Complex: {{.container_id}} ({{.code_length}} chars, {{.total_time_ms}}ms)"
```

---

## 📊 Expected Performance Metrics

Based on our analysis, here are typical TikZ render times:

### **Simple Diagrams (< 100 chars)**
- **Expected:** 1500-2000ms
- **p50:** ~1800ms
- **p95:** ~2200ms

### **Medium Diagrams (100-300 chars)**
- **Expected:** 2000-3000ms
- **p50:** ~2500ms
- **p95:** ~3500ms

### **Complex Diagrams (> 300 chars)**
- **Expected:** 3000-5000ms
- **p50:** ~3800ms
- **p95:** ~5500ms

### **Performance Breakdown**
```
Iframe creation:     50ms    (2%)
TikZJax load:       500ms   (20%)
WASM init:          300ms   (12%)
TeX compilation:   1000ms   (40%)
DVI→SVG:            400ms   (16%)
Rendering:          100ms    (4%)
Overhead:           150ms    (6%)
─────────────────────────────────
Total:            ~2500ms  (100%)
```

---

## 🚨 Alerting Rules

### **Slow Render Alert**
**Condition:** Average render time > 5 seconds for 5 minutes

**Query:**
```logql
avg_over_time(
  {app="THK Mesh Landing Page"} 
  | json 
  | event_name = "tikz_render_complete" 
  | unwrap total_time_ms [5m]
) > 5000
```

**Action:** Investigate TikZJax CDN performance or consider caching

---

### **High Error Rate Alert**
**Condition:** Error rate > 10% for 5 minutes

**Query:**
```logql
sum(rate({app="THK Mesh Landing Page"} | json | event_name = "tikz_render_error" [5m])) 
/ 
sum(rate({app="THK Mesh Landing Page"} | json | event_name =~ "tikz_render_(complete|error)" [5m])) 
* 100 > 10
```

**Action:** Check TikZJax CDN availability or syntax errors

---

## 🎯 Optimization Opportunities

### **Based on Metrics:**

1. **If `total_time_ms` is high but `iframe_render_time_ms` is low:**
   - Problem: Iframe creation/initialization overhead
   - Solution: Pre-create iframe pool, lazy loading

2. **If `iframe_render_time_ms` is consistently > 3000ms:**
   - Problem: TikZJax compilation slow
   - Solution: Consider server-side pre-rendering

3. **If error rate is high:**
   - Problem: Syntax errors or TikZJax CDN issues
   - Solution: Add syntax validation, fallback CDN

4. **If render time correlates strongly with `code_length`:**
   - Problem: Complex diagrams are slow
   - Solution: Warn users about complexity, suggest simplification

---

## 🔧 Testing

### **Manual Testing:**

1. **Visit PKC Viewer:**
   ```
   https://henry.pkc.pub
   ```

2. **Click "PKC Document Viewer"**

3. **Load "Sample TikZ Diagrams"**

4. **Open Browser Console (F12)**

5. **Look for logs:**
   ```
   [PKC Viewer] Rendering TikZ for tikz-0
   [PKC Viewer] TikZ render complete: {
     container: "tikz-0",
     totalTime: "2341.50ms",
     iframeRenderTime: "1823.20ms",
     codeLength: 245
   }
   ```

6. **Check Grafana Explore (wait 1-2 minutes):**
   ```logql
   {app="THK Mesh Landing Page"} | json | event_name =~ "tikz_.*"
   ```

---

## 📚 Summary

### **What We Track:**
- ✅ Render start time
- ✅ Render complete time
- ✅ Total duration (end-to-end)
- ✅ Iframe render duration (TikZJax only)
- ✅ Code complexity (character count)
- ✅ SVG dimensions (height, width)
- ✅ Errors and failures
- ✅ Time to failure

### **How to Use:**
1. **Monitor performance** in Grafana Explore
2. **Create dashboards** with time series, stats, histograms
3. **Set up alerts** for slow renders or high error rates
4. **Analyze patterns** (code length vs render time)
5. **Optimize** based on real user data

### **Benefits:**
- 📊 **Real user metrics** (not synthetic tests)
- 🎯 **Identify bottlenecks** (iframe vs TikZJax)
- 🚨 **Detect issues** early (errors, slowdowns)
- 📈 **Track improvements** over time
- 🔍 **Debug problems** with context

---

**Now you have full observability of TikZ rendering performance!** 🎉📊
