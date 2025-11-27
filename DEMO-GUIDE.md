# Account Management Dashboard - Demo Guide

**For: Tomas Diez Presentation**  
**Date: November 28, 2024**  
**URL: https://henry.pkc.pub/**

---

## 🎯 Demo Objective

Demonstrate **modularized Redux components** using the **Cubical Logic Model (CLM)** architecture with iframe-based component isolation.

---

## 📊 What You'll Show

### 1. **Dashboard Overview** (30 seconds)
- **URL**: `https://henry.pkc.pub/`
- Point out the header: "Account Management Dashboard - CLM + REDUX"
- Explain: "This is a fully modularized dashboard where each component is isolated"

### 2. **Component Grid Layout** (1 minute)
Show the 5 components:

1. **User List** (2 columns, purple gradient)
   - Shows 5 mock users with status (Active/Inactive)
   - Stats: Total Users, Active, Inactive
   - **Redux Slice**: `users`

2. **Redux State Viewer** (top right, dark blue)
   - Shows active CLM modules
   - Displays Redux slices (auth, users, ui)
   - Shows recent Redux actions
   - **Redux Slice**: `all`

3. **User Detail** (middle left, pink gradient)
   - Initially shows "Select a user to view details"
   - **Redux Slice**: `users`

4. **Auth Status** (middle center, gradient)
   - Shows authentication state
   - Login/Logout simulation
   - **Redux Slice**: `auth`

5. **Failure Test** (bottom right, red)
   - Intentionally crashes
   - **Status Dot**: Red (error state)

### 3. **Interactive Demo** (2 minutes)

#### Action 1: User Selection
1. Click on any user in the **User List** (e.g., "Alice Johnson")
2. **Watch**:
   - User Detail component updates with full information
   - Redux State Viewer logs the action: `user-list/user_selected`
   - All components remain responsive

**Key Point**: "This demonstrates component-to-component communication through Redux-like event broadcasting"

#### Action 2: Failure Isolation
1. Point to the **Crash Test** component (red status dot)
2. Open browser console (F12)
3. **Show**:
   - Error in crash-test iframe: `Cannot read properties of null`
   - Other components continue working perfectly
   - User can still interact with User List and User Detail

**Key Point**: "The crash is isolated to its iframe. The entire dashboard remains functional."

#### Action 3: Real-time Monitoring
1. Point to the **Redux State Viewer**
2. Click different users in User List
3. **Watch**:
   - Action log updates in real-time
   - Redux state shows `selectedUser` changing
   - CLM modules list shows which Redux slice each component uses

**Key Point**: "Every component is mapped to a Redux slice, demonstrating true modularization"

---

## 🏗️ Architecture Highlights

### CLM (Cubical Logic Model) Benefits:
- ✅ **Failure Isolation**: One component crash doesn't affect others
- ✅ **Modular Redux**: Each component maps to specific Redux slices
- ✅ **Independent Deployment**: Components can be updated separately
- ✅ **Real-time Observability**: Heartbeat monitoring and event logging

### Technical Stack:
- **Frontend**: Vanilla JavaScript + iframes
- **State Management**: Redux (simulated via postMessage)
- **Component Registry**: YAML-based (`clm-registry.yaml`)
- **Communication**: postMessage API for cross-iframe events

---

## 🎤 Key Talking Points

### Opening (15 seconds)
> "This is our Account Management Dashboard built with the Cubical Logic Model. Each component you see is completely isolated in its own iframe, yet they communicate seamlessly through a Redux-like state management system."

### During User Selection Demo (30 seconds)
> "When I click on a user, the User List component fires an event. This event is broadcast to all components, just like a Redux dispatch. The User Detail component receives this event and updates accordingly. Notice how the Redux State Viewer logs every action in real-time."

### During Failure Demo (30 seconds)
> "Here's the most important part: this red component has crashed - you can see the error in the console. But notice that I can still interact with everything else. The user list works, authentication works, the Redux monitor works. This is true failure isolation."

### Closing (15 seconds)
> "This architecture gives us the best of both worlds: modular, Redux-based state management with guaranteed failure isolation. Each component is independently deployable and maintainable."

---

## 🔧 Technical Details (If Asked)

### How does Redux integration work?
- Each component is tagged with its Redux slice in `clm-registry.yaml`
- Components communicate via `postMessage` API
- Parent dashboard broadcasts events to all iframes
- Simulates Redux dispatch/subscribe pattern

### How is failure isolation achieved?
- Each component runs in a sandboxed iframe
- Sandbox attributes: `allow-scripts allow-same-origin`
- JavaScript errors are contained within iframe boundaries
- Heartbeat monitoring detects component failures

### What's in the CLM Registry?
```yaml
- id: "user-list"
  redux_slice: "users"
  url: "https://henry.pkc.pub/components/user-list.html"
  sandbox: "allow-scripts allow-same-origin"
```

### Component Communication Flow:
```
User clicks → User List fires event → 
Parent receives event → Broadcasts to all iframes → 
User Detail receives event → Updates UI
```

---

## 🚀 Quick Start (For Testing Before Demo)

1. **Rebuild Docker**:
   ```bash
   docker-compose down && docker-compose up -d --build
   ```

2. **Open Dashboard**:
   ```
   https://henry.pkc.pub/
   ```

3. **Open Browser Console** (F12):
   - Watch for component load messages
   - See heartbeat messages every 3 seconds
   - Observe event flow when clicking users

4. **Test User Selection**:
   - Click "Alice Johnson" → User Detail updates
   - Click "Bob Smith" → User Detail updates
   - Check Redux State Viewer for action log

5. **Verify Failure Isolation**:
   - Check crash-test component has red status dot
   - Console shows error in crash-test iframe
   - All other components still interactive

---

## 📸 What Success Looks Like

### Visual Indicators:
- ✅ All status dots are **green** (except crash-test which is red)
- ✅ User List shows 5 users with stats
- ✅ Redux State Viewer shows "Active CLM Modules"
- ✅ Clicking users updates User Detail component
- ✅ Console shows heartbeat messages

### Console Output:
```
[Dashboard] Initializing CLM Account Management Dashboard...
[Dashboard] Registry loaded: {version: "2.0.0", ...}
[Dashboard] Loaded component: user-list
[Dashboard] Loaded component: user-detail
[Dashboard] Loaded component: auth-status
[Dashboard] Loaded component: redux-state-viewer
[Dashboard] Loaded component: crash-test
[User List Component] Ready
[User Detail Component] Ready
[Redux State Viewer] Ready
[Crash Test Component] Loaded - Will crash immediately!
Uncaught TypeError: Cannot read properties of null
```

---

## ⚠️ Troubleshooting

### If components don't load:
1. Check Docker is running: `docker ps`
2. Check CLM API: `curl https://henry.pkc.pub/api/clm/registry`
3. Check browser console for errors

### If user selection doesn't work:
1. Open console and watch for `[Dashboard] CLM Event:` messages
2. Verify postMessage is working
3. Check iframe sandbox attributes

### If crash test doesn't show error:
1. This is expected - it crashes immediately
2. Look for red status dot
3. Check console for `Uncaught TypeError`

---

## 🎓 Expected Questions & Answers

**Q: Why use iframes instead of React components?**  
A: Iframes provide true isolation. If a React component crashes, it can take down the entire app. With iframes, failures are contained.

**Q: How does this scale?**  
A: Each component can be deployed independently. The CLM registry is version-controlled. New components can be added without touching existing code.

**Q: What about performance?**  
A: Iframes have minimal overhead. Each component is lightweight. The postMessage API is very fast. We can lazy-load components as needed.

**Q: Can you integrate real Redux?**  
A: Yes! The current implementation simulates Redux. We can integrate Redux Toolkit by having each iframe connect to a shared Redux store via postMessage middleware.

**Q: What about authentication?**  
A: The Auth Status component demonstrates this. In production, we'd use OAuth2 (Zitadel) with tokens passed to iframes via postMessage.

---

## 📝 Follow-up Actions

After the demo, be prepared to:
1. Share the GitHub repository
2. Provide the CLM architecture documentation
3. Discuss integration with existing systems
4. Plan next steps for production deployment

---

**Good luck with the demo! 🚀**
