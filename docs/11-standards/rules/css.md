---
trigger: css
glob: "**/*.{html,css,js}"
description: CSS Standards and Best Practices for THK Mesh Project
---

# CSS Standards and Best Practices

## Core Principles

### 1. **NO INLINE CSS**
❌ **NEVER** embed CSS directly in HTML files
```html
<!-- ❌ BAD: Inline CSS -->
<style>
  body { background: #fff; }
  .card { padding: 20px; }
</style>
```

**Why?**
- Forces very long load times
- Makes pages large and "really ugly"
- Disastrous for software engineering
- Impossible to cache
- Hard to maintain and version control

### 2. **USE RELATIVE LOCAL CSS FILES**
✅ **ALWAYS** reference CSS files from local directories
```html
<!-- ✅ GOOD: Relative local CSS -->
<link rel="stylesheet" href="/css/main.css">
<link rel="stylesheet" href="/css/components.css">
<link rel="stylesheet" href="/public/css/mcard-manager.css">
```

**Benefits:**
- Control over specific versions
- Cacheable resources
- Faster load times
- Easy to update and maintain

### 3. **SELF-HOSTED CDN (Zero-Trust Architecture)**
✅ **ALWAYS** use self-hosted CSS resources via controlled CDN

**Auto-Detection (Recommended):**
```javascript
// Auto-detect BASE_URL from browser location
const { protocol, hostname, port } = window.location;
let baseUrl = `${protocol}//${hostname}`;
if (port && port !== '80' && port !== '443') {
  baseUrl += `:${port}`;
}

// CSS URLs - automatically adapt to current environment
const CSS_CDN = `${baseUrl}/css`;
const VENDOR_CDN = `${baseUrl}/vendor`;
```

**Benefits of Auto-Detection:**
- ✅ No .env dependency
- ✅ Works in any environment automatically
- ✅ localhost:8765 → uses localhost:8765
- ✅ dev.pkc.pub → uses dev.pkc.pub
- ✅ henry.pkc.pub → uses henry.pkc.pub

**Examples:**
```html
<!-- Relative paths - work everywhere -->
<link rel="stylesheet" href="/css/tailwind.css">
<link rel="stylesheet" href="/vendor/lucide/lucide.css">

<!-- Auto-generated import map -->
<script type="module" src="/js/config/auto-import-map.js"></script>
```

---

## Implementation Rules

### Rule 1: CSS File Organization
```
project/
├── public/
│   ├── css/
│   │   ├── main.css              # Global styles
│   │   ├── mcard-manager.css     # MCard specific
│   │   ├── content-renderers.css # Renderer styles
│   │   └── components/           # Component styles
│   │       ├── buttons.css
│   │       ├── cards.css
│   │       └── forms.css
│   └── vendor/
│       ├── tailwind/
│       │   └── tailwind.min.css  # Self-hosted Tailwind
│       ├── lucide/
│       │   └── lucide.css        # Self-hosted Lucide
│       └── highlight/
│           └── github-dark.css   # Self-hosted highlight.js
```

### Rule 2: CSS Loading Pattern
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>THK Mesh</title>
  
  <!-- ✅ Load CSS from self-hosted CDN -->
  <link rel="stylesheet" href="/vendor/tailwind/tailwind.min.css">
  <link rel="stylesheet" href="/css/main.css">
  <link rel="stylesheet" href="/css/mcard-manager.css">
</head>
<body>
  <!-- Content -->
</body>
</html>
```

### Rule 3: Environment-Aware CSS Loading
```javascript
// config.js - CSS CDN configuration
export const CSS_CONFIG = {
  development: {
    baseUrl: 'http://localhost:8765',
    cssPath: '/css',
    vendorPath: '/vendor'
  },
  staging: {
    baseUrl: 'https://dev.pkc.pub',
    cssPath: '/css',
    vendorPath: '/vendor'
  },
  production: {
    baseUrl: 'https://henry.pkc.pub',
    cssPath: '/css',
    vendorPath: '/vendor'
  }
};

// Get current environment from .env
const ENV = process.env.NODE_ENV || 'development';
const BASE_URL = process.env.BASE_URL || CSS_CONFIG[ENV].baseUrl;

// Build CSS URLs
export function getCSSUrl(filename) {
  return `${BASE_URL}/css/${filename}`;
}

export function getVendorCSSUrl(vendor, filename) {
  return `${BASE_URL}/vendor/${vendor}/${filename}`;
}
```

### Rule 4: Dynamic CSS Loading (JavaScript)
```javascript
// utils/css-loader.js
export function loadCSS(href, id = null) {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (id && document.getElementById(id)) {
      resolve();
      return;
    }
    
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    if (id) link.id = id;
    
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`));
    
    document.head.appendChild(link);
  });
}

// Usage
import { loadCSS } from './utils/css-loader.js';
import { getCSSUrl, getVendorCSSUrl } from './config.js';

// Load main CSS
await loadCSS(getCSSUrl('main.css'), 'main-css');

// Load vendor CSS
await loadCSS(getVendorCSSUrl('tailwind', 'tailwind.min.css'), 'tailwind-css');
```

---

## Migration Guide

### Migrating from Public CDN to Self-Hosted

#### Step 1: Download Dependencies
```bash
# Create vendor directory
mkdir -p public/vendor/tailwind
mkdir -p public/vendor/lucide
mkdir -p public/vendor/highlight

# Download Tailwind CSS
curl -o public/vendor/tailwind/tailwind.min.css \
  https://cdn.tailwindcss.com/3.4.0/tailwind.min.css

# Download Lucide icons CSS (if needed)
curl -o public/vendor/lucide/lucide.css \
  https://unpkg.com/lucide-static@latest/font/lucide.css

# Download highlight.js CSS
curl -o public/vendor/highlight/github-dark.css \
  https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github-dark.min.css
```

#### Step 2: Update HTML References
```html
<!-- ❌ BEFORE: Public CDN -->
<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github-dark.min.css">

<!-- ✅ AFTER: Self-hosted -->
<link rel="stylesheet" href="/vendor/tailwind/tailwind.min.css">
<link rel="stylesheet" href="/vendor/highlight/github-dark.css">
```

#### Step 3: Update .env Configuration
```bash
# .env
BASE_URL=https://henry.pkc.pub
NODE_ENV=production

# For local development
# BASE_URL=http://localhost:8765
# NODE_ENV=development
```

#### Step 4: Verify in Docker
```yaml
# docker-compose.yml
services:
  landingpage:
    environment:
      - BASE_URL=${BASE_URL}
      - NODE_ENV=${NODE_ENV}
    volumes:
      - ./public:/app/public:ro  # Mount CSS files
```

---

## Current Project Status

### ✅ Already Following Best Practices
- **MCard Manager**: Uses local CSS files
  - `/css/mcard-manager.css`
  - `/css/content-renderers.css`

### ⚠️ Needs Migration
- **landing-standalone.html**: Uses public Tailwind CDN
  ```html
  <!-- Current -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <!-- Should be -->
  <link rel="stylesheet" href="/vendor/tailwind/tailwind.min.css">
  ```

- **landing-page-file.html**: Uses inline CSS
  ```html
  <!-- Current -->
  <style>
    body { ... }
    .card { ... }
  </style>
  
  <!-- Should be -->
  <link rel="stylesheet" href="/css/landing.css">
  ```

---

## Enforcement Checklist

Before committing any HTML file, verify:

- [ ] No `<style>` tags in HTML (no inline CSS)
- [ ] All CSS loaded from local files (`/css/` or `/vendor/`)
- [ ] No public CDN URLs (no `cdn.tailwindcss.com`, `unpkg.com`, etc.)
- [ ] CSS files exist in `public/css/` or `public/vendor/`
- [ ] BASE_URL from `.env` used for dynamic loading
- [ ] CSS files are version controlled in git
- [ ] CSS files are mounted in Docker volumes

---

## Examples

### ✅ GOOD: MCard Manager
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MCard Manager</title>
  
  <!-- ✅ Local CSS files -->
  <link rel="stylesheet" href="/css/mcard-manager.css">
  <link rel="stylesheet" href="/css/content-renderers.css">
</head>
<body>
  <!-- Content -->
</body>
</html>
```

### ❌ BAD: Landing Page (Current)
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Landing</title>
  
  <!-- ❌ Public CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <!-- ❌ Inline CSS -->
  <style>
    body { background: linear-gradient(...); }
    .card { padding: 20px; }
  </style>
</head>
<body>
  <!-- Content -->
</body>
</html>
```

### ✅ GOOD: Landing Page (Fixed)
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Landing</title>
  
  <!-- ✅ Self-hosted Tailwind -->
  <link rel="stylesheet" href="/vendor/tailwind/tailwind.min.css">
  
  <!-- ✅ Local CSS file -->
  <link rel="stylesheet" href="/css/landing.css">
</head>
<body>
  <!-- Content -->
</body>
</html>
```

---

## Zero-Trust CDN Architecture

### Concept
All CSS resources are:
1. **Physically stored** with the project (in `public/vendor/`)
2. **Version controlled** in git
3. **Served from** our own domain (henry.pkc.pub, dev.pkc.pub)
4. **Never fetched** from external CDNs at runtime

### Benefits
- ✅ Full control over versions
- ✅ No external dependencies at runtime
- ✅ Works offline
- ✅ Faster load times (same domain)
- ✅ No privacy concerns (no third-party tracking)
- ✅ Guaranteed availability (no CDN downtime)

### Implementation
```bash
# Directory structure
public/
├── css/
│   ├── main.css           # Our custom CSS
│   ├── landing.css        # Landing page styles
│   └── mcard-manager.css  # MCard styles
└── vendor/
    ├── tailwind/
    │   ├── tailwind.min.css
    │   └── tailwind.min.css.map
    ├── lucide/
    │   └── lucide.css
    └── highlight/
        └── github-dark.css
```

---

## Action Items

### Immediate (High Priority)
1. [ ] Download Tailwind CSS to `public/vendor/tailwind/`
2. [ ] Extract inline CSS from `landing-page-file.html` to `public/css/landing.css`
3. [ ] Update `landing-standalone.html` to use self-hosted Tailwind
4. [ ] Update all HTML files to use `BASE_URL` from `.env`

### Short-term (Medium Priority)
5. [ ] Create CSS loader utility (`utils/css-loader.js`)
6. [ ] Add CSS version tracking (e.g., `vendor-versions.json`)
7. [ ] Document CSS update process
8. [ ] Add CSS integrity checks (SRI hashes)

### Long-term (Low Priority)
9. [ ] Set up CSS build pipeline (minification, autoprefixer)
10. [ ] Implement CSS code splitting for better performance
11. [ ] Add CSS linting (stylelint)
12. [ ] Create CSS component library

---

## References

- **Tailwind CSS**: https://tailwindcss.com/
- **Lucide Icons**: https://lucide.dev/
- **Highlight.js**: https://highlightjs.org/
- **CSS Best Practices**: https://developer.mozilla.org/en-US/docs/Learn/CSS/Building_blocks/Organizing

---

## Version History

- **v1.0** (2025-12-11): Initial CSS standards document
  - No inline CSS rule
  - Self-hosted CDN architecture
  - Environment-based configuration
  - Migration guide for existing files
