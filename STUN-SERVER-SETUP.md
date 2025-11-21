# STUN Server Setup Guide

## Quick Start

### 1. Start the STUN server:
```bash
./start-stun.sh
```

Or manually:
```bash
docker-compose -f docker-compose.stun.yml up -d
```

### 2. Verify it's running:
```bash
docker logs coturn-server
```

### 3. Test the STUN server:
```bash
# Install stun client (if needed)
# brew install stuntman  # macOS
# apt-get install stun-client  # Ubuntu

# Test
stunclient localhost 3478
```

## Configuration

The STUN server is configured in `coturn.conf`:
- **Port:** 3478 (default STUN port)
- **Mode:** STUN-only (no TURN relay)
- **Auth:** Disabled for simplicity
- **Logging:** Enabled for debugging

## For Production Deployment

### 1. Get a server with public IP
Deploy to a VPS (DigitalOcean, AWS, etc.)

### 2. Update coturn.conf:
```conf
# Replace with your server's public IP
external-ip=YOUR_PUBLIC_IP

# Enable authentication
# Remove: no-auth
# Add:
user=username:password
```

### 3. Update app-config.json:
```json
{
  "p2p": {
    "iceServers": [
      { "urls": "stun:your-server.com:3478" }
    ]
  }
}
```

### 4. Open firewall ports:
```bash
# UDP port 3478 for STUN
sudo ufw allow 3478/udp
```

## Monitoring

### View logs:
```bash
docker logs -f coturn-server
```

### Stop server:
```bash
docker-compose -f docker-compose.stun.yml down
```

### Restart server:
```bash
docker-compose -f docker-compose.stun.yml restart
```

## Why Run Your Own STUN Server?

1. **Privacy:** No external dependencies
2. **Reliability:** You control uptime
3. **Performance:** Lower latency if hosted near users
4. **No rate limits:** Google STUN may have limits

## STUN vs TURN

- **STUN:** Discovers public IP (what we're using)
  - Lightweight
  - Works for most P2P connections
  - Free to run

- **TURN:** Relays traffic when P2P fails
  - Heavy bandwidth usage
  - Needed for strict NATs/firewalls
  - More expensive to run

For most WebRTC applications, STUN is sufficient!
