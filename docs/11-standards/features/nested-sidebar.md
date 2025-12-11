# Nested Sidebar with Automatic Categorization

## 📁 Overview

The CLM Dashboard now features a **nested sidebar** that automatically categorizes components into **Internal** and **External** types, similar to a file system structure.

---

## 🎯 Features

### **1. Automatic Detection**
Components are automatically categorized based on their `implementation` field:

**Internal Components** 🏠
- Running on your server
- `implementation` starts with `components/`
- Examples: `components/welcome.html`, `components/pkc-viewer.html`

**External Components** 🌐
- Third-party websites
- `implementation` starts with `http://` or `https://`
- Examples: `https://www.google.com/maps/...`, `https://example.com`

### **2. Collapsible Categories**
- Click category header to expand/collapse
- Smooth slide animation
- Chevron icon rotates (▶ → ▼)
- Both categories expanded by default

### **3. Visual Hierarchy**
- Category headers with icons and counts
- Nested indentation for items
- Active component highlighted
- Hover effects throughout

---

## 🎨 Visual Structure

```
┌─────────────────────────────────────┐
│ 🏢 CLM Dashboard                    │
│ 13 CLM Modules                      │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🏠 Internal Components [11]  ▼ │ │ ← Collapsible header
│ └─────────────────────────────────┘ │
│   ├─ Welcome Component              │
│   ├─ Hero Content                   │
│   ├─ P2P Status Panel               │
│   ├─ Crash Test                     │
│   ├─ Wikipedia Viewer               │
│   ├─ User List                      │
│   ├─ User Detail                    │
│   ├─ Redux State Viewer             │
│   ├─ Wikipedia Search               │
│   ├─ PKC Document Viewer            │ ← Active (highlighted)
│   └─ Grafana Faro                   │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🌐 External Components [2]   ▼ │ │ ← Collapsible header
│ └─────────────────────────────────┘ │
│   ├─ External Website Demo          │
│   └─ Google Maps                    │
│                                     │
└─────────────────────────────────────┘
```

---

## 🔧 Implementation

### **Categorization Logic**

```javascript
function categorizeComponents(components) {
  const internal = [];
  const external = [];
  
  components.forEach(comp => {
    const impl = comp.concrete?.implementation || '';
    
    // External if starts with http:// or https://
    if (impl.startsWith('http://') || impl.startsWith('https://')) {
      external.push(comp);
    } else {
      internal.push(comp);
    }
  });
  
  return { internal, external };
}
```

**Detection Rules:**
- `components/welcome.html` → **Internal** 🏠
- `https://example.com` → **External** 🌐
- `https://www.google.com/maps/...` → **External** 🌐

---

### **Category Creation**

```javascript
function createCategorySection(categoryName, icon, components, isExpanded = true) {
  const category = document.createElement('div');
  category.className = 'component-category';
  
  // Header (clickable)
  const header = document.createElement('div');
  header.className = `category-header ${isExpanded ? 'expanded' : ''}`;
  header.innerHTML = `
    <div class="category-title">
      <span class="category-icon">${icon}</span>
      <span>${categoryName}</span>
      <span class="category-count">${components.length}</span>
    </div>
    <span class="category-chevron">▶</span>
  `;
  
  // Items container (collapsible)
  const itemsContainer = document.createElement('div');
  itemsContainer.className = `category-items ${isExpanded ? 'expanded' : ''}`;
  
  // Toggle on click
  header.onclick = () => {
    header.classList.toggle('expanded');
    itemsContainer.classList.toggle('expanded');
  };
  
  category.appendChild(header);
  category.appendChild(itemsContainer);
  
  return { category, itemsContainer };
}
```

---

## 🎨 CSS Styles

### **Category Header**

```css
.category-header {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  user-select: none;
}

.category-header:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.2);
}
```

### **Collapsible Animation**

```css
.category-items {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease-out;
  padding-left: 12px;
}

.category-items.expanded {
  max-height: 2000px;
  transition: max-height 0.5s ease-in;
}
```

### **Chevron Rotation**

```css
.category-chevron {
  font-size: 12px;
  transition: transform 0.2s;
}

.category-header.expanded .category-chevron {
  transform: rotate(90deg);
}
```

### **Component Items**

```css
.component-item {
  padding: 10px 16px;
  margin: 6px 0;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-left: 3px solid transparent;
}

.component-item.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: rgba(255, 255, 255, 0.3);
  border-left-color: #fff;
  transform: translateX(4px);
}
```

---

## 🎯 User Interactions

### **1. Expand/Collapse Category**
**Action:** Click category header  
**Result:** 
- Items slide in/out
- Chevron rotates (▶ ↔ ▼)
- Smooth animation

**Console log:**
```
[Dashboard] Internal Components collapsed
[Dashboard] External Components expanded
```

### **2. Select Component**
**Action:** Click component item  
**Result:**
- Component loads in main viewer
- Item highlighted with gradient
- Left border appears
- Slides right 4px

### **3. Hover Effects**
**Category header hover:**
- Background lightens
- Border becomes more visible

**Component item hover:**
- Background lightens
- Slides right 4px
- Border becomes more visible

---

## 📊 Component Distribution

### **Current Distribution:**

**Internal Components (11):**
1. Welcome Component
2. Hero Content
3. P2P Status Panel
4. Crash Test
5. Wikipedia Viewer
6. User List
7. User Detail
8. Redux State Viewer
9. Wikipedia Search
10. PKC Document Viewer
11. Grafana Faro

**External Components (2):**
1. External Website Demo
2. Google Maps

---

## 🔍 Console Logging

### **Categorization:**
```
[Dashboard] Registry loaded via Redux: { components: 13, ... }
[Dashboard] Categorized: { internal: 11, external: 2 }
```

### **Category Interactions:**
```
[Dashboard] Internal Components expanded
[Dashboard] External Components collapsed
[Dashboard] Internal Components collapsed
```

### **Component Loading:**
```
[Dashboard] Switched to component: pkc-viewer
[Dashboard] Loaded component via Redux: pkc-viewer
```

---

## ✅ Benefits

### **1. Better Organization**
- Clear separation of internal vs external
- Easy to find components
- Scalable structure

### **2. Reduced Clutter**
- Collapse categories you don't need
- Focus on relevant components
- Cleaner interface

### **3. Visual Clarity**
- Icons distinguish categories
- Counts show size
- Indentation shows hierarchy

### **4. No Configuration Needed**
- Automatic detection
- Works with existing registry
- No manual categorization

### **5. Professional UX**
- Smooth animations
- Intuitive interactions
- Modern design

---

## 🚀 Future Enhancements

### **Possible Additions:**

1. **More Categories**
   - Admin components
   - User components
   - System components

2. **Search/Filter**
   - Search within categories
   - Filter by type
   - Quick jump

3. **Drag & Drop**
   - Reorder components
   - Custom organization
   - Save preferences

4. **Badges**
   - Status indicators
   - Error badges
   - Update notifications

5. **Context Menu**
   - Right-click options
   - Quick actions
   - Component info

---

## 📚 Registry Compatibility

### **No Changes Required!**

The nested sidebar works with the existing `clm-registry.yaml` without any modifications:

```yaml
components:
  - hash: "welcome"
    name: "Welcome Component"
    concrete:
      implementation: "components/welcome.html"  # ← Detected as Internal
      
  - hash: "google-maps"
    name: "Google Maps"
    concrete:
      implementation: "https://www.google.com/maps/..."  # ← Detected as External
```

**Automatic detection based on `implementation` field!**

---

## 🎯 Summary

### **What Changed:**
- ✅ Sidebar now has nested structure
- ✅ Automatic categorization (Internal/External)
- ✅ Collapsible categories with animations
- ✅ Visual hierarchy with icons and counts
- ✅ No registry changes needed

### **What Stayed the Same:**
- ✅ Component loading logic
- ✅ Redux integration
- ✅ Iframe isolation
- ✅ Registry structure
- ✅ Component functionality

### **User Experience:**
- ✅ Click category to expand/collapse
- ✅ Click component to load
- ✅ Visual feedback on hover
- ✅ Active component highlighted
- ✅ Smooth animations throughout

**Perfect for organizing CLM components in a file-system-like structure!** 📁✨
