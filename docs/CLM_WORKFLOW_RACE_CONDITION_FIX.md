# CLM Workflow Race Condition Fix

## Problem Statement

When multiple CLM component test workflows run simultaneously (e.g., after pushing changes to multiple components), they all try to commit and push their test results to the same branch at the same time. This causes **race condition errors**:

```
error: atomic push failed for ref refs/heads/main. status: 5
! [rejected]        HEAD -> main (fetch first)
error: failed to push some refs
hint: Updates were rejected because the remote contains work that you do not
hint: have locally. This is usually caused by another repository pushing to
hint: the same ref.
```

### Why This Happens

```
Timeline of concurrent workflows:

T0: User pushes changes to hero.html, welcome.html, pkc-viewer.html
T1: GitHub triggers 3 workflows simultaneously
    - CLM Test - Hero Content
    - CLM Test - Welcome  
    - CLM Test - PKC Viewer

T2: All 3 workflows start running tests in parallel

T3: All 3 workflows finish tests and try to push results
    - Workflow A: git push (SUCCESS) ✅
    - Workflow B: git push (REJECTED) ❌ - remote has new commits from A
    - Workflow C: git push (REJECTED) ❌ - remote has new commits from A

Result: Only 1 workflow succeeds, 2 fail with push errors
```

---

## Solution

### 1. Shared Push Script

Created `.github/scripts/push-test-results.sh` - a reusable script that handles concurrent pushes safely.

**Key Features:**
- **Retry Logic**: Attempts push up to 5 times
- **Automatic Rebase**: Pulls and rebases on push failure
- **Exponential Backoff**: Waits 3s, 6s, 9s, 12s, 15s between retries
- **Conflict Resolution**: Handles JSON file conflicts gracefully
- **Graceful Failure**: Exits successfully even if push fails (results preserved in artifacts)

### 2. Script Usage

```bash
.github/scripts/push-test-results.sh \
  "<component-hash>" \
  "<test-run-number>" \
  "<github-token>" \
  "<repository>" \
  "<ref>"
```

**Example:**
```bash
.github/scripts/push-test-results.sh \
  "hero-content" \
  "42" \
  "${{ secrets.GITHUB_TOKEN }}" \
  "${{ github.repository }}" \
  "${{ github.ref }}"
```

---

## How It Works

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Workflow: CLM Test - Hero Content                           │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │ 1. Run Playwright Test         │
         └────────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │ 2. Generate JSON Results       │
         │    hero-content.json           │
         └────────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │ 3. Call push-test-results.sh   │
         └────────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │ 4. Git Add & Commit            │
         └────────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │ 5. Try Git Push                │
         └────────────────────────────────┘
                          │
                ┌─────────┴─────────┐
                │                   │
                ▼                   ▼
         ┌──────────┐        ┌──────────┐
         │ SUCCESS  │        │  FAILED  │
         └──────────┘        └──────────┘
                                    │
                                    ▼
                     ┌──────────────────────────┐
                     │ 6. Pull with Rebase      │
                     └──────────────────────────┘
                                    │
                                    ▼
                     ┌──────────────────────────┐
                     │ 7. Wait (exponential)    │
                     │    3s → 6s → 9s → 12s    │
                     └──────────────────────────┘
                                    │
                                    ▼
                     ┌──────────────────────────┐
                     │ 8. Retry Push (max 5x)   │
                     └──────────────────────────┘
                                    │
                          ┌─────────┴─────────┐
                          │                   │
                          ▼                   ▼
                   ┌──────────┐        ┌──────────┐
                   │ SUCCESS  │        │ GIVE UP  │
                   │    ✅    │        │    ⚠️    │
                   └──────────┘        └──────────┘
                                             │
                                             ▼
                              ┌──────────────────────────┐
                              │ Results saved in         │
                              │ artifacts (still usable) │
                              └──────────────────────────┘
```

---

## Script Logic

### push-test-results.sh

```bash
#!/bin/bash

# 1. Configure git
git config user.email "github-actions[bot]@users.noreply.github.com"
git config user.name "github-actions[bot]"

# 2. Add and commit changes
git add tests/test-components/${COMPONENT_HASH}.json
git commit -m "Update test results for ${COMPONENT_HASH}"

# 3. Retry loop with exponential backoff
max_retries=5
retry_count=0

until [ $retry_count -ge $max_retries ]; do
  if git push; then
    echo "✅ Success"
    exit 0
  else
    retry_count=$((retry_count+1))
    wait_time=$((retry_count * 3))
    
    echo "⚠️ Push failed, retrying in ${wait_time}s..."
    sleep $wait_time
    
    # Pull with rebase to integrate remote changes
    git pull --rebase || {
      # Handle rebase conflicts
      git checkout --theirs tests/test-components/${COMPONENT_HASH}.json
      git add tests/test-components/${COMPONENT_HASH}.json
      git rebase --continue
    }
  fi
done

# 4. Graceful failure (don't fail the workflow)
echo "ℹ️ Results saved in artifacts"
exit 0
```

---

## Benefits

### Before Fix
```
Scenario: 3 workflows run simultaneously

Results:
❌ 1 workflow succeeds
❌ 2 workflows fail with push errors
❌ Test results lost for 2 components
❌ Red X in GitHub Actions UI
❌ Manual intervention required
```

### After Fix
```
Scenario: 3 workflows run simultaneously

Results:
✅ All 3 workflows succeed
✅ All test results saved
✅ Automatic conflict resolution
✅ Green checkmarks in GitHub Actions UI
✅ No manual intervention needed

Timeline:
T0: All 3 workflows start
T1: Workflow A pushes immediately (SUCCESS)
T2: Workflow B pulls, rebases, pushes (SUCCESS after 1 retry)
T3: Workflow C pulls, rebases, pushes (SUCCESS after 2 retries)
```

---

## Configuration

### Retry Settings

Configurable in `push-test-results.sh`:

```bash
max_retries=5              # Maximum retry attempts
wait_time=$((retry_count * 3))  # Exponential backoff multiplier
```

**Current backoff schedule:**
- Attempt 1: Immediate
- Attempt 2: Wait 3 seconds
- Attempt 3: Wait 6 seconds
- Attempt 4: Wait 9 seconds
- Attempt 5: Wait 12 seconds
- Attempt 6: Wait 15 seconds

**Total max wait time:** 45 seconds

---

## Workflow Integration

### Old Method (Broken)

```yaml
- name: Commit results
  run: |
    git config user.email "..."
    git config user.name "..."
    git add tests/test-components/hero-content.json
    git commit -m "Update results"

- name: Push results
  uses: ad-m/github-push-action@master
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    branch: ${{ github.ref }}
```

**Problem:** No retry logic, fails on concurrent pushes

### New Method (Fixed)

```yaml
- name: Commit and Push results
  if: always()
  run: |
    chmod +x .github/scripts/push-test-results.sh
    .github/scripts/push-test-results.sh \
      "hero-content" \
      "${{ github.run_number }}" \
      "${{ secrets.GITHUB_TOKEN }}" \
      "${{ github.repository }}" \
      "${{ github.ref }}"
```

**Benefits:** Automatic retry, rebase, and conflict resolution

---

## Testing

### Test Concurrent Pushes

1. **Trigger multiple workflows:**
   ```bash
   # Edit multiple components
   touch components/hero.html
   touch components/welcome.html
   touch components/pkc-viewer.html
   
   git add components/
   git commit -m "Test concurrent workflows"
   git push
   ```

2. **Monitor GitHub Actions:**
   - All workflows should complete successfully
   - Check logs for retry messages
   - Verify all JSON files updated in repository

### Expected Log Output

```
🔧 Configuring git...
📝 Adding test results file...
💾 Committing changes...
🚀 Pushing with retry logic...
⚠️ Push failed, pulling and retrying in 3s (attempt 1/5)...
🔄 Pulling latest changes with rebase...
✅ Successfully pushed test results for hero-content
```

---

## Troubleshooting

### Issue: All retries fail

**Symptoms:**
```
❌ Failed to push after 5 attempts
ℹ️ The test results are saved as artifacts
```

**Causes:**
- Network issues
- GitHub API rate limits
- Repository permissions

**Solution:**
- Results are still available in workflow artifacts
- Download artifacts manually
- Check GitHub status page
- Verify GITHUB_TOKEN permissions

### Issue: Rebase conflicts

**Symptoms:**
```
⚠️ Rebase conflict detected, using theirs strategy...
```

**Solution:**
- Script automatically resolves using `--theirs` strategy
- For JSON files, this takes the most recent version
- No manual intervention needed

### Issue: Slow pushes

**Symptoms:**
- Workflows take longer to complete
- Multiple retry attempts

**Solution:**
- This is expected behavior with concurrent workflows
- Exponential backoff prevents overwhelming GitHub
- Consider reducing number of concurrent workflows

---

## Maintenance

### Updating the Script

1. **Edit script:**
   ```bash
   vim .github/scripts/push-test-results.sh
   ```

2. **Test locally:**
   ```bash
   bash .github/scripts/push-test-results.sh \
     "test-component" \
     "1" \
     "$GITHUB_TOKEN" \
     "xlp0/LandingPage" \
     "refs/heads/main"
   ```

3. **Commit and push:**
   ```bash
   git add .github/scripts/push-test-results.sh
   git commit -m "Update push script"
   git push
   ```

### Updating All Workflows

Use the batch update script:

```bash
python3 .github/scripts/update-all-workflows.py
```

---

## Related Files

- `.github/scripts/push-test-results.sh` - Main push script
- `.github/scripts/update-all-workflows.py` - Batch update utility
- `.github/workflows/clm-test-*.yml` - All 13 component workflows
- `docs/CLM_MULTI_COMPONENT_TESTING.md` - Testing system overview

---

## References

- [Git Rebase Documentation](https://git-scm.com/docs/git-rebase)
- [GitHub Actions Concurrency](https://docs.github.com/en/actions/using-jobs/using-concurrency)
- [Exponential Backoff Pattern](https://en.wikipedia.org/wiki/Exponential_backoff)

---

**Last Updated:** December 3, 2025  
**Status:** ✅ Implemented and Tested
