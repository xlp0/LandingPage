#!/bin/bash
set -e

# Script to safely push test results with retry logic to handle race conditions
# Usage: ./push-test-results.sh <component-hash> <test-run-number> <github-token> <repository> <ref>

COMPONENT_HASH=$1
TEST_RUN_NUMBER=$2
GITHUB_TOKEN=$3
REPOSITORY=$4
REF=$5

echo "🔧 Configuring git..."
git config --local user.email "github-actions[bot]@users.noreply.github.com"
git config --local user.name "github-actions[bot]"

echo "📝 Adding test results file..."
git add tests/test-components/${COMPONENT_HASH}.json

# Only commit if there are changes
if ! git diff --staged --quiet; then
  echo "💾 Committing changes..."
  git commit -m "Update test results for ${COMPONENT_HASH} [run ${TEST_RUN_NUMBER}]"
  
  echo "🚀 Pushing with retry logic..."
  max_retries=5
  retry_count=0
  
  until [ $retry_count -ge $max_retries ]; do
    if git push https://x-access-token:${GITHUB_TOKEN}@github.com/${REPOSITORY}.git HEAD:${REF}; then
      echo "✅ Successfully pushed test results for ${COMPONENT_HASH}"
      exit 0
    else
      retry_count=$((retry_count+1))
      if [ $retry_count -lt $max_retries ]; then
        wait_time=$((retry_count * 3))
        echo "⚠️ Push failed, pulling and retrying in ${wait_time}s (attempt $retry_count/$max_retries)..."
        sleep $wait_time
        
        echo "🔄 Pulling latest changes with rebase..."
        git pull --rebase https://x-access-token:${GITHUB_TOKEN}@github.com/${REPOSITORY}.git ${REF} || {
          echo "⚠️ Rebase conflict detected, using theirs strategy for JSON files..."
          git checkout --theirs tests/test-components/${COMPONENT_HASH}.json
          git add tests/test-components/${COMPONENT_HASH}.json
          git rebase --continue || true
        }
      else
        echo "❌ Failed to push after $max_retries attempts"
        echo "ℹ️ This is likely due to concurrent pushes from other workflows"
        echo "ℹ️ The test results are saved as artifacts and can be retrieved manually"
        exit 0  # Don't fail the workflow, just log the issue
      fi
    fi
  done
else
  echo "ℹ️ No changes to commit for ${COMPONENT_HASH}"
fi
