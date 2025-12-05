# THK Mesh Landing Page - Code Cleanup Plan
**Date:** 2025-12-01  
**Author:** Code Review Assistant  
**Status:** Ready for Implementation

## Executive Summary
This document outlines a comprehensive cleanup plan for the THK Mesh Landing Page codebase. The primary goals are to:
1. Remove hardcoded production URLs and replace with localhost defaults
2. Clean up demonstration and test files
3. Standardize environment configuration
4. Remove deprecated code and improve maintainability

## 1. Hardcoded Values to Fix

### 1.1 Production URLs
**Issue:** Many files contain hardcoded references to production domains  
**Default:** Should default to localhost for development

| File | Current Hardcoded Value | Should Be |
|------|------------------------|-----------|
| `.env` | `BASE_URL=https://henry.pkc.pub` | `BASE_URL=http://localhost:3000` |
| `.env` | `WEBSOCKET_URL=wss://dev.pkc.pub/ws/` | `WEBSOCKET_URL=ws://localhost:8765/ws/` |
| `.env` | `REDIRECT_URI=https://henry.pkc.pub/auth-callback-enhanced.html` | `REDIRECT_URI=http://localhost:3000/auth-callback-enhanced.html` |
| `routes/auth.js:8` | `'https://henry.pkc.pub/auth-callback-enhanced.html'` | `'http://localhost:3000/auth-callback-enhanced.html'` |
| `index.html:360` | `'348213051452882951'` (fallback) | Should use env or null |
| `index.html:378` | `'348213051452882951'` (fallback) | Should use env or null |
| `ws-server.js:18` | `['http://localhost:3000', 'https://henry.pkc.pub', 'https://dev.pkc.pub']` | Dynamic from env |
| `clm-registry.yaml:18` | `registry_url: "https://henry.pkc.pub/clm"` | `registry_url: "http://localhost:3000/clm"` |

### 1.2 OAuth Configuration
**Issue:** OAuth client IDs and domains are hardcoded in multiple places

| File | Issue | Fix |
|------|-------|-----|
| `js/modules/auth-manager.js` | Contains hardcoded client ID | Remove or use env fallback |
| `landing-standalone.html` | Hardcoded OAuth config | Remove or update to localhost |
| `js/oauth-handler.js` | May contain hardcoded values | Check and use env |

### 1.3 External Service URLs
**Issue:** Google Maps and example.com are hardcoded in registry

| File | Current | Recommendation |
|------|---------|----------------|
| `clm-registry.yaml:150` | `https://example.com` | Keep as demo |
| `clm-registry.yaml:164` | Google Maps embed URL | Keep as demo |

## 2. Files to Clean Up or Remove

### 2.1 Demonstration/Test Files
These files appear to be for testing and should be reviewed for removal or cleanup:

**Recommended for Removal:**
- `test-offline.html` - Test file
- `landing-page-file.html` - Appears to be duplicate/test
- `index-clm.html` - Old version, superseded by `index.html`
- `auth-callback-redux.html` - Superseded by `auth-callback-enhanced.html`
- `components/crash-test-external.html` - Test component
- `components/auth-status.html` - Deprecated, functionality moved to Redux

**Keep but Document as Demo:**
- `components/crash-test.html` - Intentional failure demo (document in README)
- `landing-standalone.html` - Standalone demo (clean up hardcoded values)
- `pkc-viewer.html` - Duplicate of `components/pkc-viewer.html` (remove one)

### 2.2 Deprecated Documentation
Review and archive old documentation:

**Move to Archive:**
- `docs/FIND_REGENERATE_SECRET.md`
- `docs/GENERATE_CLIENT_SECRET.md`
- `docs/SETUP_ZITADEL_SECRET.md`
- `docs/ZITADEL_CLIENT_SECRET_GUIDE.md`
- Multiple OAuth setup guides that duplicate information

## 3. Environment Configuration Standardization

### 3.1 Create Default `.env.local` Template
```env
# Local Development Configuration
NODE_ENV=development
PORT=3000

# Base URL for CLM components
BASE_URL=http://localhost:3000

# WebSocket Configuration
WEBSOCKET_URL=ws://localhost:8765/ws/

# STUN Servers (using public Google STUN)
STUN_SERVERS=stun:stun.l.google.com:19302

# OAuth Configuration (optional for local dev)
ZITADEL_CLIENT_ID=
ZITADEL_CLIENT_SECRET=
ZITADEL_DOMAIN=
REDIRECT_URI=http://localhost:3000/auth-callback-enhanced.html

# Optional Features
PKC_Title_Text=THK Mesh - Local Development
```

### 3.2 Update `.env.example`
Ensure `.env.example` reflects localhost defaults with clear comments for production deployment.

## 4. Code Quality Improvements

### 4.1 Remove Console Logs
Search and remove or wrap debug console.log statements:
- Production code should use proper logging levels
- Debug logs should be conditional on `NODE_ENV`

### 4.2 Error Handling
Standardize error handling across:
- WebSocket connections
- OAuth flows
- Component loading

### 4.3 Redux Cleanup
- Remove unused actions and reducers
- Consolidate duplicate selectors
- Add proper TypeScript definitions (future)

## 5. CORS Configuration

### 5.1 Dynamic CORS Origins
Update `ws-server.js` to read allowed origins from environment:

```javascript
// Instead of hardcoded array
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',') 
  : ['http://localhost:3000'];
```

## 6. Component Registry Cleanup

### 6.1 CLM Registry Updates
- Change default `registry_url` to localhost
- Use relative paths consistently
- Document which components are demos vs production

### 6.2 Component Status
Mark components clearly:
- Production Ready
- Demo/Example
- Under Development
- Deprecated

## 7. Build and Deployment

### 7.1 Docker Configuration
- Ensure Docker builds work with localhost defaults
- Update docker-compose.yml for local development
- Create separate docker-compose.prod.yml for production

### 7.2 GitHub Actions
Review and update:
- `.github/workflows/deploy-k8s.yml` - Ensure env vars are injected
- Remove hardcoded production values

## 8. Implementation Priority

### Phase 1: Critical - Must Complete First
1. ✅ Fix hardcoded OAuth configuration in `index.html`
2. ⬜ Update `.env` defaults to localhost
3. ⬜ Fix `routes/auth.js` hardcoded redirect URI
4. ⬜ Update `ws-server.js` CORS configuration

### Phase 2: Important - Complete After Phase 1
1. ⬜ Remove deprecated test files
2. ⬜ Clean up duplicate documentation
3. ⬜ Standardize error handling
4. ⬜ Update CLM registry defaults

### Phase 3: Enhancement - Complete After Phase 2
1. ⬜ Add comprehensive logging system
2. ⬜ Create developer documentation
3. ⬜ Add unit tests for critical paths
4. ⬜ Implement TypeScript definitions

## 9. Testing Checklist

After cleanup, verify:
- [ ] Local development works without any `.env` file
- [ ] OAuth login works with local configuration
- [ ] All components load from localhost
- [ ] WebSocket connects to local server
- [ ] No console errors on fresh install
- [ ] Docker build works locally
- [ ] Production deployment still works with proper `.env`

## 10. Documentation Updates

Post-cleanup documentation needs:
1. Update README with clear local setup instructions
2. Create DEVELOPMENT.md for developer guidelines
3. Update DEPLOYMENT.md for production setup
4. Add ARCHITECTURE.md for system overview
5. Create CONTRIBUTING.md for contribution guidelines

## 11. Excluded from Cleanup

These items should remain as-is:
1. External component demos (Google Maps, example.com)
2. Production k8s configurations (in `/k8s` folder)
3. Historical documentation in `/docs/archive`
4. Third-party libraries in `/js/libs`

## 12. Success Metrics

Cleanup will be considered successful when:
1. `npm install && npm start` works without configuration
2. No hardcoded production URLs in source code
3. All tests pass (when implemented)
4. Documentation is clear and up-to-date
5. New developers can onboard quickly with minimal friction

## 13. Risk Mitigation

Before implementing cleanup:
1. Create full backup of current codebase
2. Test changes in separate branch
3. Verify production deployment process
4. Document any breaking changes
5. Communicate changes to team

## Appendix A: Files Requiring Manual Review

These files need careful manual review before changes:
- `/k8s/*` - Kubernetes configurations
- `/.github/workflows/*` - CI/CD pipelines
- `/docs/erros/*` - Historical error documentation
- `/components/*` - Each component for demo vs production status

## Appendix B: Regex Patterns for Cleanup

Useful search patterns:
```regex
# Find hardcoded URLs
https?://[a-zA-Z0-9.-]+\.pkc\.pub

# Find console.log statements
console\.(log|debug|info|warn|error)\(

# Find hardcoded ports
:(3000|3001|8765|8080|7302)

# Find TODO comments
(TODO|FIXME|HACK|XXX|NOTE):?
```

## Next Steps

1. Review this plan with the team
2. Create feature branch: `cleanup/2025-12-01-standardization`
3. Implement Phase 1 changes
4. Test thoroughly
5. Merge and deploy
6. Continue with Phase 2 and 3

---
*This cleanup plan is a living document and should be updated as implementation progresses.*
