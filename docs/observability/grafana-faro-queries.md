# Finding TikZ Performance Data in Grafana

## 🎯 Your Console Shows It's Working!

Your console logs show TikZ is rendering:
```
tikz-0: 27725.40ms (24685.80ms iframe) - 52 chars
tikz-11: 27724.50ms (24767.30ms iframe) - 642 chars (most complex!)
```

**Key Insight:** ~27 seconds total time, ~24 seconds in iframe (TikZJax compilation)

---

## 📊 Step-by-Step: Find Your Data in Grafana

### **Step 1: Go to Explore**
```
https://lckoo1230.grafana.net/explore
```

### **Step 2: Select the RIGHT Data Source**

⚠️ **IMPORTANT:** Faro data goes to **Loki** (logs), not the Faro app dashboard!

**Select Data Source:**
- ✅ **`grafanacloud-lckoo1230-logs`** (Loki)
- ❌ NOT "Faro" data source
- ❌ NOT "Prometheus" data source

### **Step 3: Try These Queries**

#### **Query 1: All Faro Events**
```logql
{app="THK Mesh Landing Page"}
```
**What to expect:** All logs from your app

---

#### **Query 2: All Events (JSON parsed)**
```logql
{app="THK Mesh Landing Page"} | json
```
**What to expect:** Logs with JSON fields extracted

---

#### **Query 3: TikZ Events Only**
```logql
{app="THK Mesh Landing Page"} | json | event_name =~ "tikz_.*"
```
**What to expect:** Only TikZ-related events

---

#### **Query 4: TikZ Render Complete**
```logql
{app="THK Mesh Landing Page"} | json | event_name = "tikz_render_complete"
```
**What to expect:** Successful TikZ renders with timing data

---

#### **Query 5: Show Render Times**
```logql
{app="THK Mesh Landing Page"} 
| json 
| event_name = "tikz_render_complete"
| line_format "Container: {{.container_id}} | Time: {{.total_time_ms}}ms | Code: {{.code_length}} chars"
```
**What to expect:** Formatted list of render times

---

### **Step 4: Check Time Range**

⚠️ **Make sure your time range includes when you just tested!**

**Top right corner:**
- Click the time picker
- Select **"Last 15 minutes"** or **"Last 1 hour"**
- Click "Run query" (top right)

---

### **Step 5: If You See Nothing...**

#### **Possible Issue 1: Data Not Sent Yet**
**Solution:** Wait 1-2 minutes, then refresh

#### **Possible Issue 2: Wrong Data Source**
**Solution:** Make sure you selected `grafanacloud-lckoo1230-logs` (Loki)

#### **Possible Issue 3: Faro Not Initialized**
**Check browser console for:**
```
[Faro] ✓ Initialized successfully
```

**If you see:**
```
Faro is not defined
```
**Then Faro didn't load. Check `index.html` has Faro script.**

#### **Possible Issue 4: Events Not Being Sent**
**Check browser Network tab (F12 → Network):**
- Filter by "collect"
- Look for POST requests to `faro-collector-prod-ap-southeast-2.grafana.net`
- Status should be `200 OK`

---

## 🔍 **Debug: Check if Faro is Sending Data**

### **Open Browser Console (F12)**

#### **Check 1: Is Faro Initialized?**
```javascript
console.log(window.faro);
```
**Expected:** Object with `api`, `config`, etc.
**If undefined:** Faro didn't load

#### **Check 2: Manually Send Test Event**
```javascript
window.faro.api.pushEvent('test_event', {
  test_field: 'test_value',
  timestamp: Date.now()
});
```
**Expected:** No errors in console
**Then check Grafana Explore:**
```logql
{app="THK Mesh Landing Page"} | json | event_name = "test_event"
```

#### **Check 3: Check Network Requests**
1. Open Network tab (F12 → Network)
2. Filter by "collect"
3. Reload page and trigger TikZ render
4. Look for POST to `faro-collector-prod-ap-southeast-2.grafana.net/collect/...`
5. Click on request → Preview → Check payload

**Expected payload:**
```json
{
  "events": [
    {
      "name": "tikz_render_complete",
      "attributes": {
        "container_id": "tikz-0",
        "total_time_ms": 27725,
        ...
      }
    }
  ]
}
```

---

## 📊 **Create a Dashboard**

Once you can see data in Explore, create a dashboard:

### **Step 1: Create New Dashboard**
```
https://lckoo1230.grafana.net/dashboard/new
```

### **Step 2: Add Panel**

#### **Panel 1: TikZ Render Time (Time Series)**

**Query:**
```logql
{app="THK Mesh Landing Page"} 
| json 
| event_name = "tikz_render_complete" 
| unwrap total_time_ms
```

**Settings:**
- Visualization: Time series
- Y-axis label: "Render Time (ms)"
- Title: "TikZ Render Time"

---

#### **Panel 2: Average Render Time (Stat)**

**Query:**
```logql
avg_over_time(
  {app="THK Mesh Landing Page"} 
  | json 
  | event_name = "tikz_render_complete" 
  | unwrap total_time_ms [15m]
)
```

**Settings:**
- Visualization: Stat
- Unit: milliseconds (ms)
- Title: "Avg Render Time (15m)"

---

#### **Panel 3: Render Count (Stat)**

**Query:**
```logql
count_over_time(
  {app="THK Mesh Landing Page"} 
  | json 
  | event_name = "tikz_render_complete" [15m]
)
```

**Settings:**
- Visualization: Stat
- Title: "Total Renders (15m)"

---

#### **Panel 4: Render Time by Container (Table)**

**Query:**
```logql
{app="THK Mesh Landing Page"} 
| json 
| event_name = "tikz_render_complete"
```

**Settings:**
- Visualization: Table
- Columns: container_id, total_time_ms, code_length
- Title: "Render Details"

---

## 🎯 **Expected Results from Your Console Data**

Based on your console logs, you should see:

### **Render Times:**
- **Range:** 26,306ms - 27,728ms (~26-28 seconds)
- **Average:** ~27,000ms (27 seconds)
- **Iframe time:** ~24,700ms (24.7 seconds)

### **Code Complexity:**
- **Smallest:** 52 chars (tikz-0)
- **Largest:** 642 chars (tikz-11)
- **Most common:** 100-300 chars

### **Observations:**
1. **Very consistent render times** (~27s regardless of code length)
2. **Iframe time is 90% of total** (24.7s / 27s)
3. **Code length doesn't correlate** (52 chars takes same time as 642 chars!)

**Why?** TikZJax initialization (loading WASM, TeX core) dominates the time, not compilation!

---

## 🚨 **Troubleshooting Checklist**

### **If Data Doesn't Show in Grafana:**

- [ ] **Wait 1-2 minutes** after testing (data ingestion delay)
- [ ] **Check time range** in Grafana (last 15 min)
- [ ] **Use correct data source** (`grafanacloud-lckoo1230-logs`)
- [ ] **Check Faro initialized** (`window.faro` in console)
- [ ] **Check network requests** (POST to faro-collector)
- [ ] **Check for errors** in browser console
- [ ] **Try manual test event** (see Check 2 above)

### **If Faro Not Initialized:**

1. **Check `index.html` has Faro SDK:**
   ```html
   <script src="https://unpkg.com/@grafana/faro-web-sdk@^1.3.0/dist/bundle/faro-web-sdk.iife.js"></script>
   ```

2. **Check Faro initialization code:**
   ```javascript
   const faro = window.GrafanaFaroWebSdk.initializeFaro({
     url: 'https://faro-collector-prod-ap-southeast-2.grafana.net/collect/...',
     app: { name: 'THK Mesh Landing Page', ... }
   });
   ```

3. **Check for JavaScript errors** that might prevent Faro from loading

---

## 📚 **Quick Reference**

### **Grafana URLs:**
- **Explore:** https://lckoo1230.grafana.net/explore
- **Dashboards:** https://lckoo1230.grafana.net/dashboards
- **Faro App:** https://lckoo1230.grafana.net/a/grafana-kowalski-app/apps/81/overview

### **Data Source:**
- **Name:** `grafanacloud-lckoo1230-logs`
- **Type:** Loki (logs)

### **App Label:**
- **Label:** `app="THK Mesh Landing Page"`

### **Event Names:**
- `tikz_render_start`
- `tikz_render_complete`
- `tikz_render_error`

---

## 🎯 **Next Steps**

1. ✅ **Verify data in Explore** (use queries above)
2. ✅ **Create dashboard** (use panel configs above)
3. ✅ **Set up alerts** (for slow renders or errors)
4. ✅ **Analyze patterns** (code length vs time)
5. ✅ **Optimize** (based on real data)

**Your console logs prove it's working! Now let's find it in Grafana!** 🎉
