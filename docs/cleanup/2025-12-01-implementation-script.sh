#!/bin/bash

# THK Mesh Landing Page - Cleanup Implementation Script
# Date: 2025-12-01
# This script automates the cleanup tasks identified in the cleanup plan

set -e  # Exit on error

echo "========================================="
echo "THK Mesh Landing Page - Cleanup Script"
echo "Date: 2025-12-01"
echo "========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Not in the LandingPage directory. Please run from project root."
    exit 1
fi

echo "Phase 1: Backup Current State"
echo "=============================="
print_status "Creating backup branch..."
git checkout -b backup/pre-cleanup-2025-12-01 || print_warning "Backup branch already exists"
git checkout main

echo ""
echo "Phase 2: Create Cleanup Branch"
echo "=============================="
print_status "Creating cleanup branch..."
git checkout -b cleanup/2025-12-01-standardization

echo ""
echo "Phase 3: Update Environment Files"
echo "================================="

# Create .env.local with localhost defaults
cat > .env.local << 'EOF'
# Local Development Configuration
# Created: 2025-12-01
NODE_ENV=development
PORT=3000

# Base URL for CLM components
BASE_URL=http://localhost:3000

# WebSocket Configuration
WEBSOCKET_URL=ws://localhost:8765/ws/

# STUN Servers (using public Google STUN)
STUN_SERVERS=stun:stun.l.google.com:19302

# OAuth Configuration (optional for local dev)
# Leave empty for local development without auth
ZITADEL_CLIENT_ID=
ZITADEL_CLIENT_SECRET=
ZITADEL_DOMAIN=
REDIRECT_URI=http://localhost:3000/auth-callback-enhanced.html

# Optional Features
PKC_Title_Text=THK Mesh - Local Development
EOF
print_status "Created .env.local with localhost defaults"

# Update .env.example with better defaults
cat > .env.example << 'EOF'
# WebRTC Dashboard Configuration
# Copy this file to .env and customize for your deployment
#
# For local development: Use .env.local or these defaults
# For production: Override all values appropriately

# Node environment
NODE_ENV=development

# Server port
PORT=3000

# Base URL for CLM components
# Local: http://localhost:3000
# Production: https://your-domain.com
BASE_URL=http://localhost:3000

# WebSocket URL
# Local: ws://localhost:8765/ws/
# Production: wss://your-domain.com/ws/
WEBSOCKET_URL=ws://localhost:8765/ws/

# STUN Servers (comma-separated)
STUN_SERVERS=stun:stun.l.google.com:19302

# ===== OAUTH2 CONFIGURATION (Optional) =====
# Leave empty for local development
# Required for production with authentication
ZITADEL_CLIENT_ID=
ZITADEL_CLIENT_SECRET=
ZITADEL_DOMAIN=
REDIRECT_URI=http://localhost:3000/auth-callback-enhanced.html

# Application Title
PKC_Title_Text=THK Mesh Landing Page
EOF
print_status "Updated .env.example with localhost defaults"

echo ""
echo "Phase 4: Fix Hardcoded Values"
echo "============================="

# Fix routes/auth.js hardcoded redirect URI
if [ -f "routes/auth.js" ]; then
    sed -i.bak "s|'https://henry.pkc.pub/auth-callback-enhanced.html'|'http://localhost:3000/auth-callback-enhanced.html'|g" routes/auth.js
    print_status "Fixed hardcoded redirect URI in routes/auth.js"
fi

# Fix CLM registry default URL
if [ -f "clm-registry.yaml" ]; then
    sed -i.bak 's|registry_url: "https://henry.pkc.pub/clm"|registry_url: "http://localhost:3000/clm"|g' clm-registry.yaml
    print_status "Updated CLM registry URL to localhost"
fi

echo ""
echo "Phase 5: Mark Test Files"
echo "========================"

# Add headers to test/demo files
test_files=(
    "test-offline.html"
    "components/crash-test.html"
    "components/crash-test-external.html"
    "landing-standalone.html"
)

for file in "${test_files[@]}"; do
    if [ -f "$file" ]; then
        # Check if already marked
        if ! grep -q "DEMO/TEST FILE" "$file"; then
            # Add comment at the beginning of HTML files
            sed -i.bak '1i\
<!-- DEMO/TEST FILE - Not for production use -->' "$file"
            print_status "Marked $file as demo/test"
        fi
    fi
done

echo ""
echo "Phase 6: Create Deprecated Folder"
echo "================================="
mkdir -p deprecated
print_status "Created deprecated folder for old files"

# Move deprecated files (with user confirmation)
deprecated_files=(
    "index-clm.html"
    "landing-page-file.html"
    "auth-callback-redux.html"
    "components/auth-status.html"
)

echo ""
print_warning "The following files are marked for deprecation:"
for file in "${deprecated_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  - $file"
    fi
done

read -p "Move these files to deprecated folder? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    for file in "${deprecated_files[@]}"; do
        if [ -f "$file" ]; then
            mv "$file" "deprecated/$(basename $file)"
            print_status "Moved $file to deprecated/"
        fi
    done
else
    print_warning "Skipped moving deprecated files"
fi

echo ""
echo "Phase 7: Clean Backup Files"
echo "==========================="
find . -name "*.bak" -type f -delete
print_status "Removed .bak files"

echo ""
echo "Phase 8: Generate Summary Report"
echo "================================"

cat > docs/cleanup/2025-12-01-summary.md << 'EOF'
# Cleanup Implementation Summary
**Date:** 2025-12-01
**Branch:** cleanup/2025-12-01-standardization

## Changes Applied

### Environment Configuration
- ✅ Created `.env.local` with localhost defaults
- ✅ Updated `.env.example` with better documentation
- ✅ Removed production URLs from default configuration

### Code Updates
- ✅ Fixed hardcoded redirect URI in `routes/auth.js`
- ✅ Updated CLM registry URL to localhost
- ✅ Marked demo/test files with headers

### File Organization
- ✅ Created `deprecated/` folder
- ✅ Moved obsolete files to deprecated folder
- ✅ Cleaned up backup files

## Testing Checklist

Please verify:
- [ ] Run `npm install`
- [ ] Run `npm start` (or `docker-compose up`)
- [ ] Access http://localhost:3000
- [ ] Verify all components load
- [ ] Test OAuth login (if configured)
- [ ] Check browser console for errors

## Next Steps

1. Test all functionality locally
2. Review changes: `git diff main`
3. Commit changes: `git add -A && git commit -m "cleanup: Standardize to localhost defaults"`
4. Push branch: `git push origin cleanup/2025-12-01-standardization`
5. Create PR for review

## Rollback Instructions

If issues occur:
```bash
git checkout main
git branch -D cleanup/2025-12-01-standardization
git checkout backup/pre-cleanup-2025-12-01
```
EOF

print_status "Generated summary report at docs/cleanup/2025-12-01-summary.md"

echo ""
echo "========================================="
echo "Cleanup Script Completed!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Review changes: git status && git diff"
echo "2. Test the application locally"
echo "3. Commit if satisfied: git add -A && git commit -m 'cleanup: Standardize to localhost defaults'"
echo ""
print_warning "Remember to test thoroughly before merging!"
