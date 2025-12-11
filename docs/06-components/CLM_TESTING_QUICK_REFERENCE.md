# CLM Testing System - Quick Reference

## 🚀 Quick Start

### Run Test Lokal
```bash
# Start services
docker-compose -f github-actions-docker-compose.yml up -d

# Run test
npx playwright test tests/test-clm-welcome.spec.js

# Stop services
docker-compose down -v
```

### Trigger GitHub Actions
- **Auto**: Push ke `main` atau `develop`
- **Manual**: Actions → CLM Component Tests → Run workflow

---

## 📂 File Locations

| File | Purpose |
|------|---------|
| `tests/test-clm-welcome.spec.js` | Playwright test script |
| `tests/test-components/welcome.json` | Test results JSON |
| `.github/workflows/clm-component-test.yml` | GitHub Actions workflow |
| `index.html` (line 310) | Dashboard badge |
| `docs/CLM_TESTING_SYSTEM.md` | Full documentation |

---

## 🔄 Workflow Sequence

```
Push Code
    ↓
CLM Component Tests (runs first)
    ↓
├─→ Playwright Tests
└─→ Docker Build & Push
        ↓
    K8s Deploy
```

---

## 📊 JSON Format

```json
{
  "hash": "welcome",
  "timestamp": "2024-12-03T10:30:00Z",
  "test_run": 123,
  "status": "success",
  "github_actions_url": "https://github.com/.../runs/123",
  "commit_sha": "abc123",
  "branch": "main",
  "actor": "username"
}
```

---

## 🎨 Badge Display

**Format**: `[✅ welcome] • [Run #123] • [Passed]`

**Colors**:
- 🟢 Success: `rgba(46, 204, 113, 0.3)`
- 🔴 Failure: `rgba(231, 76, 60, 0.3)`
- ⚫ Unknown: `rgba(255, 255, 255, 0.3)`

**Actions**:
- **Click**: Open GitHub Actions
- **Hover**: Scale animation
- **Tooltip**: Full details

---

## 🧪 Test Coverage

### Welcome Component Tests

1. **Basic Loading** ✅
   - Component button visible
   - Iframe loaded
   - Content visible
   - Screenshot captured

2. **Failure Isolation** 🛡️
   - Main page stable after component crash
   - Can switch between components

3. **Performance** ⚡
   - Navigation time measured
   - Component load time measured
   - Compared vs expected (500ms)

---

## 🔧 Common Commands

```bash
# Run specific test
npx playwright test tests/test-clm-welcome.spec.js

# Run all CLM tests
npx playwright test tests/test-clm-*.spec.js

# Run with UI mode
npx playwright test --ui

# Generate report
npx playwright show-report

# Debug mode
npx playwright test --debug

# View test results
cat tests/test-components/welcome.json
```

---

## 🐛 Troubleshooting

### Badge not showing
```javascript
// Check browser console
console.log('[Test Status] Loading test results...');

// Verify JSON accessible
curl http://localhost:8765/tests/test-components/welcome.json
```

### Workflow not running
- Check: `.github/workflows/clm-component-test.yml` exists
- Verify: Workflow name matches in other workflows
- Check: Branch protection rules

### Test failing
```bash
# Check Docker services
docker ps

# Check app logs
docker-compose logs

# Manual test
curl http://localhost:8765
```

---

## 📝 Adding New Component Test

1. **Create test file**:
   ```bash
   cp tests/test-clm-welcome.spec.js tests/test-clm-{name}.spec.js
   ```

2. **Update workflow**:
   ```yaml
   - name: Run CLM {name} tests
     run: npx playwright test tests/test-clm-{name}.spec.js
   ```

3. **Update JSON save**:
   ```yaml
   cat > tests/test-components/{hash}.json
   ```

4. **Update dashboard** (optional):
   ```javascript
   loadTestStatus('{hash}');
   ```

---

## 💡 Tips

- **Parallel testing**: Use strategy matrix untuk test multiple components
- **Auto-refresh**: Badge auto-refresh setiap 5 menit
- **Manual trigger**: Gunakan `workflow_dispatch` untuk skip dependencies
- **Debug**: Use `--headed` flag untuk melihat browser
- **Screenshots**: Otomatis tersimpan di `tests/test-results/`

---

## 📚 Resources

- [Full Documentation](./CLM_TESTING_SYSTEM.md)
- [Playwright Docs](https://playwright.dev)
- [GitHub Actions Docs](https://docs.github.com/actions)
- [CLM Registry](../clm-registry.yaml)

---

**Last Updated**: 2024-12-03  
**Version**: 1.0.0
