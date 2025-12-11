# CLM: WS Status Component

## 🔷 Abstract Dimension (What?)

### 1.1 Core Concept
The **WS Status Component** is the **Atomic Feedback Unit**. It is the smallest possible manifestation of the "Mandatory Observability" principle.

### 1.2 Purpose & Narrative Role
- **Pulse of the System**: It indicates the heartbeat of the WebSocket connection to the signaling server.
- **Binary Truth**: It has two states—Connected (Green/Pulse) or Disconnected (Red/Static). This reduces the complex networking state to a single bit of information for the user.

## 🛠️ Concrete Dimension (How?)

### 2.1 Implementation Architecture
A minimal `CubicalComponent` that acts as a status badge.

```javascript
// js/components/WSStatusComponent.js
class WSStatusComponent extends CubicalComponent {
    mount() {
        this.element.innerHTML = `
            <span class="w-2 h-2 rounded-full bg-gray-400" id="ws-dot"></span>
            <span>WS: idle</span>
        `;
    }
}
```

### 2.2 Interaction
- Driven by the `net-gateway` module.
- Uses `anime.js` to pulse the dot when connected, adding a "lifelike" quality to the indicator.

## ⚖️ Balanced Dimension (Why?)

### 3.1 Governance & Consistency
- **Simplicity**: It does one thing and does it perfectly.
- **Redundancy**: It complements the P2P Status Component. While P2P shows the *mesh*, WS shows the *umbilical cord* to the server. Both are needed for a complete picture (CLM triangulation).

### 3.2 Observability & Feedback
- **Visual Feedback**: The color change and pulsing animation provide instant, pre-attentive processing feedback. The user knows the status without reading text.

### 3.3 Justification
Why this component? To provide **Assurance**. In a distributed system, knowing you are connected to the signaling plane is the baseline for trust.
