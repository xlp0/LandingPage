# P2P Video Meeting Module

## Overview
A serverless, multi-person video conferencing solution built with WebRTC. Supports unlimited participants in a mesh network topology where each peer connects directly to all other peers. No server infrastructure required except for serving static files.

## Features
- 🎥 **Video Conferencing**: High-quality video streaming between multiple participants
- 🎤 **Audio Chat**: Crystal-clear audio with echo cancellation and noise suppression
- 💬 **Text Chat**: Real-time text messaging alongside video
- 🔒 **Serverless**: No backend required - pure P2P connections
- 👥 **Multi-Person**: Support for multiple participants (mesh topology)
- 🎮 **Media Controls**: Toggle video/audio on/off during calls
- 📋 **Easy Sharing**: Simple room codes for joining meetings

## Architecture

### Core Components

#### 1. **index.html** - Self-contained UI
- Complete video meeting interface
- Responsive grid layout for multiple video streams
- Integrated chat panel
- Media controls

#### 2. **video-meeting.js** - Main Module
```javascript
class VideoMeeting {
  - Manages WebRTC connections for multiple peers
  - Handles media stream management
  - Coordinates room creation/joining
  - Manages UI updates and chat
}
```

### Connection Flow

```
Multi-Person Meeting Flow:
===========================

1. Host Creates Room
   ├─> Generates unique room ID
   ├─> Creates initial WebRTC offer
   └─> Gets shareable room code

2. Participants Join
   ├─> Enter room code
   ├─> Create answer for host
   └─> Send answer back to host

3. Mesh Network Forms
   ├─> Each new participant connects to all existing peers
   ├─> Media streams exchanged bidirectionally
   └─> Full mesh topology established

4. Communication
   ├─> Video/Audio streams via WebRTC
   ├─> Text chat via DataChannel
   └─> Media state updates broadcast to all
```

### Network Topology

```
Mesh Network (Full Connected):
==============================
    Peer A
   /  |  \
  /   |   \
Peer B----Peer C
  \   |   /
   \  |  /
    Peer D

Each peer maintains direct connection to all other peers
```

## Technical Implementation

### WebRTC Configuration
```javascript
{
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
}
```

### Media Constraints
```javascript
{
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: 'user'
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
}
```

### Message Types
```javascript
// Chat message
{ type: 'chat', sender: 'Peer Name', text: 'Hello!' }

// Media state update
{ type: 'media-state', peerId: 'xxx', video: true, audio: false }

// Stream negotiation
{ type: 'stream-offer', peerId: 'xxx', offer: {...} }
```

## Usage

### Local Development
1. Navigate to: `http://localhost:3000/js/modules/video-meeting/index.html`
2. Allow camera/microphone permissions when prompted
3. Create or join a room

### Creating a Meeting
1. Click "🏠 Create Room"
2. Copy the generated room code
3. Share code with participants

### Joining a Meeting
1. Click "🔗 Join Room"
2. Paste the room code
3. Send your answer code back to host
4. Host completes the connection

### During the Meeting
- **Toggle Video**: Click "📹 Video On/Off"
- **Toggle Audio**: Click "🎤 Audio On/Off"
- **Send Chat**: Type message and press Enter
- **Leave Meeting**: Click "📞 Leave Room"

## File Structure
```
video-meeting/
├── index.html        # Complete UI and entry point
├── video-meeting.js  # Core video meeting logic
└── README.md         # This documentation
```

## Browser Requirements
- Modern browser with WebRTC support (Chrome, Firefox, Safari, Edge)
- Camera/microphone permissions
- HTTPS connection (or localhost for development)

## Scalability Considerations

### Mesh Network Limitations
- Each peer connects to all others: O(n²) connections
- Bandwidth usage increases linearly with participants
- Recommended maximum: 4-6 participants for optimal performance

### Future Enhancements for Scale
- [ ] SFU (Selective Forwarding Unit) mode
- [ ] MCU (Multipoint Control Unit) mode
- [ ] Dynamic topology switching based on participant count
- [ ] Simulcast for adaptive quality

## Security Notes
- All connections are peer-to-peer (no central server)
- WebRTC provides built-in encryption (DTLS-SRTP)
- Room codes should be shared via secure channels
- No persistent storage of meeting data

## Troubleshooting

### Common Issues

1. **Camera/Mic not working**
   - Check browser permissions
   - Ensure no other app is using the devices
   - Try refreshing the page

2. **Connection fails**
   - Check firewall settings
   - Ensure both peers are online
   - Try using a different network

3. **Poor video quality**
   - Check bandwidth availability
   - Reduce number of participants
   - Lower video resolution in constraints

## Future Improvements
- [ ] Screen sharing capability
- [ ] Recording functionality
- [ ] Virtual backgrounds
- [ ] Breakout rooms
- [ ] Persistent room links
- [ ] Mobile responsive improvements
- [ ] Connection quality indicators
- [ ] Automatic reconnection
- [ ] File sharing via DataChannel
- [ ] Whiteboard collaboration

## Dependencies
- `ConnectionManager` from `../p2p-serverless/connection.js`
- `DiscoveryManager` from `../p2p-serverless/discovery.js`
- No external libraries required!

## License
MIT - Free to use and modify
