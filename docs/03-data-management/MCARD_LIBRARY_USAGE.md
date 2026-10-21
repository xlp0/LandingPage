# MCard Library Usage & API Patterns

This guide demonstrates how to interact with the MCard system in `LandingPage`.

---

## 🚀 Client-Side Single-Page MCard Distillation (`SMR-09`)

The landing page itself can be distilled into an MCard record:

```javascript
import { distillLandingPage } from './js/landing-page-mcard.js';

// Distill the active document into a content-addressed card
const card = distillLandingPage(document, {
  uri: 'urn:mcard:content:landing_page',
  includeTelemetry: true
});

console.log('Distilled Card Hash:', card.hash);
console.log('Card Metadata:', card.metadata);
```

---

## 📡 REST API Endpoints (`server/mcard-api.mjs`, `server/test-run-api.mjs`)

### 1. Querying MCards
```bash
# Get card by hash
curl -s http://localhost:3001/api/mcard/cards/:hash

# Resolve handle pointer (e.g. @welcome)
curl -s http://localhost:3001/api/mcard/handles/welcome

# Search cards by query
curl -s "http://localhost:3001/api/mcard/search?q=responsive"
```

### 2. Test Run Storage & Revision Chains
```bash
# Save a test run record (up to 2MB payload limit)
curl -X POST http://localhost:3001/api/test-runs \
  -H "Content-Type: application/json" \
  -d @test-run.json

# Fetch latest run for a target and device
curl -s "http://localhost:3001/api/test-runs/latest?target=http://localhost:4321/&device=iphone-16-pro&orientation=portrait"
```
