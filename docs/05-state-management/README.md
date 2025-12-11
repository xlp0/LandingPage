# 📊 State Management

Redux architecture, slices, and state patterns.

## Documents in This Section

### Core Documentation
- **redux/** - Redux documentation folder
  - **INDEX.md** - Redux overview and navigation
  - **REDUX_ARCHITECTURE.md** - State architecture
  - **slices/** - Individual slice documentation
    - **auth-slice.md** - Authentication state
    - **clm-slice.md** - CLM component state
    - **rtc-connection-slice.md** - WebRTC connections
    - **participants-slice.md** - User management
    - **invitations-slice.md** - Invitation system

### Testing & Fixes
- **REDUX_AUTH_TESTING.md** - Auth testing guide
- **REDUX_FIX_SUMMARY.md** - Bug fixes summary
- **REDUX_SLICES_IMPLEMENTATION.md** - Implementation guide

## Redux Store Structure

```javascript
{
  auth: {          // Authentication state
    user, token, isAuthenticated
  },
  clm: {           // CLM components
    components, registry, loading
  },
  rtcConnection: { // WebRTC connections
    localStream, peerConnections, status
  },
  participants: {  // User management
    list, active, status
  },
  invitations: {   // Invitation system
    pending, accepted, rejected
  }
}
```

## Quick Start

1. **Overview** - Read [redux/INDEX.md](redux/INDEX.md)
2. **Architecture** - Study [redux/REDUX_ARCHITECTURE.md](redux/REDUX_ARCHITECTURE.md)
3. **Slices** - Explore [redux/slices/](redux/slices/)
4. **Testing** - Follow [REDUX_AUTH_TESTING.md](REDUX_AUTH_TESTING.md)

## Related Sections

- [02-authentication/](../02-authentication/) - Auth implementation
- [04-networking/](../04-networking/) - RTC implementation
- [08-testing/](../08-testing/) - Testing strategies
