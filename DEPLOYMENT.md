# WebRTC Dashboard - Deployment Guide

## 🌐 Production Deployment

The WebRTC Dashboard now supports deployment to public domains like `pkc.pub`.

### Auto-Detection of WebSocket URL

The application automatically detects the correct WebSocket URL based on the environment:

#### Local Development
```
Page URL: http://localhost:3000/...
WebSocket: ws://localhost:8765/ws/
```

#### Production (HTTP)
```
Page URL: http://pkc.pub/...
WebSocket: ws://pkc.pub/ws/
```

#### Production (HTTPS)
```
Page URL: https://pkc.pub/...
WebSocket: wss://pkc.pub/ws/
```

## 🚀 Deployment Steps

### 1. Server Requirements

Your server must:
- ✅ Serve static files (HTML, CSS, JS)
- ✅ Run WebSocket server on `/ws/` endpoint
- ✅ Support both HTTP and WebSocket on same port

### 2. Using Docker

The included `docker-compose.yml` handles everything:

```bash
# Build and start
docker-compose up -d --build

# Check logs
docker-compose logs -f

# Stop
docker-compose down
```

### 3. Nginx Configuration (if using reverse proxy)

```nginx
server {
    listen 80;
    server_name pkc.pub;
    
    # Serve static files
    location / {
        root /path/to/LandingPage;
        index index.html;
        try_files $uri $uri/ =404;
    }
    
    # WebSocket proxy
    location /ws/ {
        proxy_pass http://localhost:8765;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket timeout
        proxy_read_timeout 86400;
    }
}
```

### 4. HTTPS/SSL Configuration

For production with HTTPS:

```nginx
server {
    listen 443 ssl http2;
    server_name pkc.pub;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # ... rest of config same as above
    # WebSocket will automatically use WSS (secure WebSocket)
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name pkc.pub;
    return 301 https://$server_name$request_uri;
}
```

## 🔧 Server Configuration

### unified-server.js

The server automatically handles both HTTP and WebSocket:

```javascript
// Serves on port 8765 by default
// HTTP: http://localhost:8765/
// WebSocket: ws://localhost:8765/ws/
```

### Environment Variables

Create `.env` file:

```env
PORT=8765
NODE_ENV=production
```

## 📱 Cross-Device Testing

### Local Network Testing

1. Find your local IP:
   ```bash
   # Mac/Linux
   ifconfig | grep "inet "
   
   # Windows
   ipconfig
   ```

2. Access from other devices:
   ```
   http://192.168.1.100:8765/js/modules/webrtc-dashboard/
   ```

### Public Domain Testing

1. Deploy to `pkc.pub`
2. Access from any device:
   ```
   https://pkc.pub/js/modules/webrtc-dashboard/
   ```

## 🐛 Troubleshooting

### WebSocket Connection Failed

**Symptom:**
```
WebSocket connection to 'ws://localhost:8765/ws/' failed
```

**Solution:**
- ✅ Check server is running
- ✅ Check firewall allows port 8765
- ✅ Verify WebSocket URL is correct
- ✅ Check browser console for actual URL being used

### Mixed Content Error (HTTPS)

**Symptom:**
```
Mixed Content: The page was loaded over HTTPS, but attempted to connect to insecure WebSocket
```

**Solution:**
- ✅ Ensure server supports WSS (secure WebSocket)
- ✅ Use valid SSL certificate
- ✅ Application will auto-detect and use `wss://` on HTTPS pages

### CORS Issues

**Solution:**
The unified server already handles CORS:
```javascript
app.use(cors({
    origin: '*',
    credentials: true
}));
```

## 📊 Monitoring

### Check WebSocket Connection

Open browser console:
```javascript
// Should see:
[WSBroadcast] WebSocket URL: wss://pkc.pub/ws/
[WSBroadcast] ✅ WebSocket connected
```

### Server Logs

```bash
docker-compose logs -f landingpage
```

Look for:
```
WebSocket server listening on port 8765
Client connected
Broadcasting message type "room-created"
```

## 🔐 Security Considerations

### Production Checklist

- ✅ Use HTTPS (SSL/TLS)
- ✅ Use WSS (secure WebSocket)
- ✅ Implement rate limiting
- ✅ Validate all WebSocket messages
- ✅ Sanitize user input
- ✅ Set proper CORS policies
- ✅ Use environment variables for secrets

### WebRTC Security

- ✅ End-to-end encryption (built-in to WebRTC)
- ✅ Room isolation (messages can't leak)
- ✅ No server-side message storage
- ✅ Direct P2P connections

## 🌍 Multi-Region Deployment

For global deployment:

1. **Deploy server in multiple regions**
2. **Use DNS-based load balancing**
3. **Users connect to nearest server**
4. **WebRTC connections are still P2P**

## 📈 Scaling

### Horizontal Scaling

- Multiple server instances
- Load balancer in front
- Shared Redis for room state (optional)

### Vertical Scaling

- Increase server resources
- WebSocket connections are lightweight
- WebRTC is P2P (no server bandwidth)

## 🎯 Performance Tips

1. **Enable gzip compression**
2. **Use CDN for static assets**
3. **Minimize WebSocket messages**
4. **Use WebRTC for all data transfer**
5. **Implement connection pooling**

## 📝 Notes

- WebSocket is only for signaling
- All chat messages go via WebRTC P2P
- Server doesn't store messages
- Room discovery uses WebSocket broadcast
- Supports unlimited concurrent rooms
