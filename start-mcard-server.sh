#!/bin/bash
# PKC Landing Page - MCard HTTP Service Startup Script
# This script starts the Node.js server with mcard-js integration

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  PKC Landing Page - MCard Server${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Error: Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✅ Node.js found: $(node --version)${NC}"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install dependencies${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Dependencies installed${NC}"
fi

# Find an available port (default: 4000)
PORT=${PORT:-4000}
MAX_PORT=$((PORT + 10))

check_port() {
    lsof -i :$1 > /dev/null 2>&1
    return $?
}

echo -e "${BLUE}🔍 Checking for available port...${NC}"
while check_port $PORT; do
    echo -e "${YELLOW}⚠️  Port $PORT is in use${NC}"
    PORT=$((PORT + 1))
    if [ $PORT -gt $MAX_PORT ]; then
        echo -e "${RED}❌ No available ports found between 4000-${MAX_PORT}${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ Using port: $PORT${NC}"
echo ""

# Create data directory if it doesn't exist
if [ ! -d "data" ]; then
    mkdir -p data
    echo -e "${GREEN}✅ Created data directory${NC}"
fi

# Start the server
echo -e "${BLUE}🚀 Starting MCard HTTP Service...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}📍 Home Page:${NC}      http://localhost:$PORT"
echo -e "${GREEN}📍 Music Example:${NC}  http://localhost:$PORT/public/examples/Music/SyncedMusicVisualizerV5.html"
echo -e "${GREEN}📍 WebSocket:${NC}      ws://localhost:$PORT/ws/"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Export PORT and start server
export PORT=$PORT
exec node ws-server.js
