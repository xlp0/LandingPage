#!/bin/bash

# ZITADEL Setup Script for Monopoly Game Authentication
# This script helps you configure ZITADEL integration

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   ZITADEL Authentication Setup for Monopoly Game          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}This script will help you configure ZITADEL authentication.${NC}"
echo ""

# Step 1: Check if config file exists
CONFIG_FILE="public/config/zitadel-config.js"

if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}Error: Configuration file not found at $CONFIG_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Configuration file found"
echo ""

# Step 2: Prompt for Client ID
echo -e "${YELLOW}Step 1: ZITADEL Application Setup${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Before proceeding, you need to create an application in ZITADEL:"
echo ""
echo "1. Go to: https://zit.pkc.pub"
echo "2. Create a new project (or use existing)"
echo "3. Create a new application:"
echo "   - Type: Web / User Agent"
echo "   - Auth Method: PKCE"
echo "   - Name: Monopoly Game"
echo ""
echo "4. Configure Redirect URIs:"
echo "   Local:      http://localhost:3000/public/examples/games/monopoly-auth.html"
echo "   Production: https://your-domain.com/public/examples/games/monopoly-auth.html"
echo ""
echo "5. Configure Post Logout Redirect URIs:"
echo "   Local:      http://localhost:3000"
echo "   Production: https://your-domain.com"
echo ""
echo -e "${BLUE}Have you completed the ZITADEL setup? (y/n)${NC}"
read -r setup_complete

if [ "$setup_complete" != "y" ]; then
    echo -e "${YELLOW}Please complete the ZITADEL setup first, then run this script again.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Step 2: Enter Your Client ID${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}Enter your ZITADEL Client ID:${NC}"
read -r client_id

if [ -z "$client_id" ]; then
    echo -e "${RED}Error: Client ID cannot be empty${NC}"
    exit 1
fi

# Step 3: Update configuration file
echo ""
echo -e "${YELLOW}Step 3: Updating Configuration${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Backup original file
cp "$CONFIG_FILE" "$CONFIG_FILE.backup"
echo -e "${GREEN}✓${NC} Created backup: $CONFIG_FILE.backup"

# Update Client ID in config file
sed -i.tmp "s/clientId: 'YOUR_CLIENT_ID_HERE'/clientId: '$client_id'/" "$CONFIG_FILE"
rm "$CONFIG_FILE.tmp"

echo -e "${GREEN}✓${NC} Updated configuration file with Client ID"
echo ""

# Step 4: Verify configuration
echo -e "${YELLOW}Step 4: Configuration Summary${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "ZITADEL Issuer:  https://zit.pkc.pub"
echo "Client ID:       $client_id"
echo "Redirect URI:    (dynamic based on deployment)"
echo "Scopes:          openid profile email"
echo ""

# Step 5: Next steps
echo -e "${YELLOW}Step 5: Next Steps${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Start the development server:"
echo -e "   ${GREEN}npm run dev${NC}"
echo ""
echo "2. Access the authenticated game:"
echo -e "   ${GREEN}http://localhost:3000/app.html${NC}"
echo ""
echo "3. Click on: Apps → Monopoly (Auth)"
echo ""
echo "4. Test the login flow with your ZITADEL account"
echo ""
echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""
echo "For troubleshooting, see: docs/ZITADEL_INTEGRATION_GUIDE.md"
echo ""
