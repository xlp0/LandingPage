#!/bin/bash
echo "Starting STUN server with coturn..."
docker-compose -f docker-compose.stun.yml up -d
echo ""
echo "✅ STUN server started!"
echo "📍 STUN URL: stun://localhost:7302"
echo ""
echo "To view logs: docker logs -f coturn-server"
echo "To stop: docker-compose -f docker-compose.stun.yml down"
