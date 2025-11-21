# How to Connect to the WebRTC Dashboard

## For Your Friend on the Same WiFi Network

### 1. Open the Dashboard

Go to this URL in your browser:
```
http://192.168.1.149:8765/js/modules/webrtc-dashboard/
```

### 2. That's it!

You should see the WebRTC Dashboard and be able to:
- Create or join rooms
- Connect via WebRTC
- Send messages
- Video chat (if enabled)

---

## Network Configuration

- **Your Computer IP:** 192.168.1.149
- **WebSocket Server:** ws://192.168.1.149:8765/ws/
- **STUN Server:** stun://192.168.1.149:7302
- **Web Server:** http://192.168.1.149:8765

## Troubleshooting

### If your friend can't connect:

1. **Check firewall:**
   ```bash
   # On your Mac, allow incoming connections
   # System Settings > Network > Firewall
   # Make sure ports 8765 and 7302 are allowed
   ```

2. **Verify services are running:**
   ```bash
   docker ps
   # Should show: landingpage-local and coturn-server
   ```

3. **Test from your friend's device:**
   ```bash
   # Ping your IP
   ping 192.168.1.149
   
   # Test web server
   curl http://192.168.1.149:8765
   ```

4. **Check you're on the same WiFi:**
   - Both devices must be on the same WiFi network
   - Your IP: 192.168.1.149
   - Friend's IP should be: 192.168.1.xxx

---

## To Switch Back to Localhost

If you want to test alone later, change `app-config.json`:
```json
{
  "wsHost": "localhost",
  "wsPort": 3000,
  "wsPath": "/ws/",
  "p2p": {
    "iceServers": [
      { "urls": "stun:localhost:7302" }
    ]
  }
}
```

Then restart:
```bash
docker-compose restart
```
