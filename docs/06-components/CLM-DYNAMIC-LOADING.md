# CLM Dynamic Loading Architecture

## ✅ **100% Registry-Based Component Loading**

The CLM dashboard is **completely registry-driven** with **zero hardcoded component imports**.

## 🎯 **How It Works**

### **1. Single Source of Truth: `clm-registry.yaml`**

```yaml
components:
  - hash: "welcome"
    name: "Welcome Component"
    abstract:
      context: "Entry point for user interaction"
      goal: "Greet user and set narrative tone"
    concrete:
      implementation: "https://henry.pkc.pub/components/welcome.html"
      sandbox: "allow-scripts"
    balanced:
      metrics_endpoint: "/metrics/welcome"
      health_check: "/health/welcome"
```

### **2. Dynamic Loading Flow**

```javascript
// Step 1: Fetch registry from API
const registryAction = await store.dispatch(fetchCLMRegistry());

// Step 2: Loop through ALL components in registry
for (const componentConfig of registry.components) {
  
  // Step 3: Create iframe dynamically
  const iframeId = `iframe-${componentConfig.hash}`;
  const frame = createComponentFrame(componentConfig);
  
  // Step 4: Load via Redux
  await store.dispatch(loadCLMComponent({ 
    componentId: componentConfig.hash, 
    iframeId: iframeId 
  }));
  
  // Step 5: Set iframe src from registry
  iframe.src = componentConfig.concrete?.implementation;
}
```

### **3. Zero Hardcoded References**

**✅ No hardcoded component URLs in HTML**
```html
<!-- Components will be dynamically inserted here -->
<div class="components-grid" id="componentsGrid"></div>
```

**✅ No hardcoded iframe elements**
```javascript
// All iframes created dynamically from registry
const frame = document.createElement('div');
frame.innerHTML = `<iframe id="${iframeId}" sandbox="${sandbox}"></iframe>`;
```

**✅ No hardcoded component imports**
```javascript
// Only Redux store and slices imported
import store from './js/redux/store.js';
import { fetchCLMRegistry, loadCLMComponent } from './js/redux/slices/clm-slice.js';
```

## 🚀 **Adding New Components is Trivial**

### **Before (Hardcoded)**
```javascript
// ❌ Old way - had to modify code
<iframe src="components/new-component.html"></iframe>
import NewComponent from './components/new-component.js';
```

### **After (Registry-Based)**
```yaml
# ✅ New way - just add to registry!
- hash: "new-component"
  name: "New Component"
  abstract:
    context: "New feature"
    goal: "Do something new"
  concrete:
    implementation: "https://henry.pkc.pub/components/new-component.html"
    sandbox: "allow-scripts"
  balanced:
    metrics_endpoint: "/metrics/new-component"
```

**That's it!** No code changes needed. The dashboard automatically:
1. Fetches the updated registry
2. Creates the iframe
3. Loads the component
4. Tracks it in Redux
5. Monitors its health

## 📊 **Current Architecture**

```
┌─────────────────────────────────────────────┐
│         clm-registry.yaml                   │
│         (Single Source of Truth)            │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│         API: /api/clm/registry              │
│         (Serves registry as JSON)           │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│         Redux: fetchCLMRegistry()           │
│         (Fetches and stores in state)       │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│         index.html: loadDashboard()         │
│         (Loops through components)          │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│         Dynamic iframe creation             │
│         (One per component)                 │
└─────────────────────────────────────────────┘
```

## 🎯 **Benefits**

### **1. Zero Code Changes for New Components**
Just add to `clm-registry.yaml` and deploy. Done!

### **2. Hot Reload Capability**
Could implement registry polling to add components without redeploying.

### **3. A/B Testing Ready**
Different users can get different registries with different components.

### **4. Feature Flags Built-in**
Add `enabled: false` to registry entry to hide components.

### **5. Version Control**
Registry is versioned (`version: "2.0.0"`), can support multiple versions.

## 🔧 **Example: Adding Wikipedia Component**

```yaml
# Step 1: Add to clm-registry.yaml
- hash: "wikipedia-search"
  name: "Wikipedia Search"
  abstract:
    context: "Knowledge base search"
    goal: "Search Wikipedia articles"
  concrete:
    implementation: "https://henry.pkc.pub/components/wikipedia-search.html"
    sandbox: "allow-scripts"
  balanced:
    metrics_endpoint: "/metrics/wikipedia-search"
    expected_load_time_ms: 400
```

```bash
# Step 2: Deploy
git add clm-registry.yaml
git commit -m "Add Wikipedia search component"
git push
docker-compose up -d --build
```

**Done!** The component appears on the dashboard automatically.

## 📝 **Registry API Response**

```json
{
  "success": true,
  "registry": {
    "version": "2.0.0",
    "registry_url": "https://henry.pkc.pub/clm",
    "components": [
      {
        "hash": "welcome",
        "name": "Welcome Component",
        "abstract": { "context": "...", "goal": "..." },
        "concrete": { "implementation": "...", "sandbox": "..." },
        "balanced": { "metrics_endpoint": "...", "health_check": "..." }
      }
      // ... all other components
    ]
  }
}
```

## ✅ **Verification Checklist**

- ✅ No hardcoded component URLs in HTML
- ✅ No hardcoded iframe elements
- ✅ No component-specific imports
- ✅ All components loaded from registry
- ✅ Dynamic iframe creation
- ✅ Registry-driven sandbox attributes
- ✅ Registry-driven metrics endpoints
- ✅ Registry-driven health checks

## 🎉 **Conclusion**

**The CLM dashboard is 100% registry-driven!**

Adding a new component is as simple as:
1. Create the component HTML file
2. Add entry to `clm-registry.yaml`
3. Deploy

**No code changes. No imports. No hardcoding. Just pure CLM architecture! 🚀**
