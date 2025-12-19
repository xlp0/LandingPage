---
created: 2025-12-19T11:55:00+08:00
modified: 2025-12-19T14:24:00+08:00
subject: ABC Theatre, 3D Visualization, Causal Cone, PKC Box, Spacetime, Physics, Type Systems, Information Carriers
title: "3D Theater Example: A Window to the ABC Theatre"
authors: Ben Koo, Antigravity
---

# 🎭 3D Theater Example: ABC Theatre Implementation

> **This example serves as a concrete implementation of the ABC Theatre concept**—a type-safe, data-driven presentation layer where diverse information carriers are treated as **concrete representables** governed by compositional logic.

## Philosophical Foundation

The ABC Theatre rests on the historical trajectory from **Kant** to **Hamilton** to the **Science of Pure Time**. All performances on this stage are **compositional sequences of Sum Types (+) and Product Types (×)**, built from Nothing.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│               THE HISTORICAL TRAJECTORY: FROM KANT TO PKC                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐        ┌───────────────────┐        ┌───────────────────┐  │
│  │ KANT (1781)  │   →    │ HAMILTON (1837)   │   →    │ PKC (2025)        │  │
│  ├──────────────┤        ├───────────────────┤        ├───────────────────┤  │
│  │ Pure         │        │ Algebra =         │        │ REPL =            │  │
│  │ Intuitions   │        │ Science of        │        │ Operational       │  │
│  │ of Time      │        │ Pure Time         │        │ Pure Time         │  │
│  │ and Space    │        │                   │        │                   │  │
│  └──────────────┘        └───────────────────┘        └───────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                    BUILDING FROM NOTHING                               │  │
│  │  ∅ (Void)  →  Sum (+)  →  Product (×)  →  Exponential (→)  →  Universe │  │
│  │    Empty      Choice      Combination      Function          Everything│  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Why This Example?

This Three.js + Anime.js example demonstrates the core principles of the **ABC Theatre**:

### 1. **Information Carriers as Representables**
Each 3D object (Teapot, Earth, Solar System, etc.) is an **information carrier** with explicit state spaces:

| Carrier | Representable Form | State Space |
|---------|-------------------|-------------|
| 🫖 Teapot | `teapot.json` | Geometry + Material + Transform |
| 🌍 Earth | `earth.json` + `earth.jpg` | Satellite Texture + Cloud Layer + Moon Orbit |
| ☀️ Solar System | `solar.json` | Sun + Planets + Asteroid Belt |
| 🦠 Microbes | `microbes.json` | Petri Dish + Organisms |
| ⏳ Causal Cone | `objects.js` (createCausalCone) | Spacetime Structure + Present Plane |
| 🔮 Crystal Ball | `objects.js` (createCrystalBall) | PKC Box + Nested Transparency |

### 3. **Specialized High-Fidelity Models**

Beyond generic loaders, the Theatre features hand-crafted mathematical and conceptual models:

#### **A. The Causal Cone (Spacetime Model)**
A visualization of relativistic causality—the "Light Cone." 
- **Future Cone (Blue)**: The region of spacetime that can be influenced by the origin event.
- **Past Cone (Orange)**: The region of spacetime that can influence the origin event.
- **Present Plane (Science of Governance)**: The 2D slice representing the "now," textured with the "Science of Governance" map.
- **Tabletop Stand**: A mahogany base that grounds the model in the physical "theatre" space.

#### **B. The PKC Box in a Crystal Ball**
A demonstration of nested transparency and rendering priority:
- **Crystal Sphere**: A high-transmission `MeshPhysicalMaterial` shell.
- **Internal PKC Box**: A wooden storage box containing three "Polynomial" cards (PCard, MCard, VCard).
- **GASing Academy Logo**: A high-resolution decal applied to the lid.
- **Omnidirectional Branding**: High-fidelity labels ("PKC with Monadic Cards") on all four sides of the lid, ensuring the identity is visible from any angle.
- **Rendered MCard**: An MP4 visualization of the box's orbital rotation is available for inclusion in the PKC MCard registry.

### 2. **Type-Safe Data Definitions**
All 3D objects are defined in JSON files with a schema (`schema.json`) that **makes illegal states unrepresentable**:

```json
{
  "$schema": "./schema.json",
  "id": "earth",
  "metadata": { "type": "scene" },
  "materials": {
    "earth": {
      "type": "standard",
      "texture": { "type": "image", "url": "textures/earth.jpg" }
    }
  },
  "children": [
    { "name": "earth", "geometry": { "type": "sphere" }, "material": "earth" }
  ]
}
```

### 3. **Sum Types (+) for Choice**
The dropdown menu represents a **Sum Type**—a choice between mutually exclusive objects:

```
ObjectChoice = Teapot | Table | Crystal | Earth | Solar | Microbes
```

### 4. **Product Types (×) for Composition**
Each scene is a **Product Type**—a combination of geometry, material, transform, and animation:

```
Scene = Geometry × Material × Transform × Animation
Earth = EarthSphere × CloudLayer × Atmosphere × Moon
```

---

## Architecture: Data-Driven Stagecraft

```
public/examples/THREEJS_ANIMEJS/
├── Theater_Example.html     # 🎭 The Stage (presentation layer)
├── css/
│   └── theater.css          # 🎨 Stage Styling
├── js/
│   ├── main.js              # 🎬 Performance Orchestrator
│   ├── scene.js             # 🌐 Three.js Scene Setup
│   ├── objects.js           # 🏭 Object Factory (legacy)
│   ├── object-loader.js     # 📦 Data-Driven Object Loader
│   ├── animations.js        # 🎞️ Anime.js Timeline
│   ├── ui.js                # 🖱️ User Interaction
│   ├── config.js            # ⚙️ Configuration Registry
│   └── audio.js             # 🔊 Synthesized Audio (Tone.js)
├── data/
│   ├── objects/             # 📄 Type-Safe JSON Definitions
│   │   ├── schema.json      # 📐 Validation Schema
│   │   ├── teapot.json
│   │   ├── table.json
│   │   ├── crystal.json
│   │   ├── earth.json
│   │   ├── solar.json
│   │   └── microbes.json
│   └── geojson-continents.json  # 🗺️ GeoJSON Country Data
├── textures/
│   ├── earth.jpg            # 🌍 2K Satellite Imagery
│   └── clouds.jpg           # ☁️ 2K Cloud Layer
└── scripts/
    └── convert-geojson.cjs  # 🔧 GeoJSON Converter Tool
```

---

## REPL as Performance: Redux Integration

Every interaction on this stage follows the **REPL Cycle** (Read-Evaluate-Print-Loop), which maps directly to the **Redux unidirectional data flow** used in the LandingPage application:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                    REPL ↔ REDUX: THE UNIFIED DATA FLOW                           │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐      │
│   │     READ     │ → │   EVALUATE   │ → │    PRINT     │ → │    LOOP      │      │
│   ├──────────────┤   ├──────────────┤   ├──────────────┤   ├──────────────┤      │
│   │ User Action  │   │ Reducer      │   │ State Change │   │ Re-render    │      │
│   │ (Dispatch)   │   │ (Pure Fn)    │   │ (New State)  │   │ (Subscribe)  │      │
│   └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘      │
│         │                  │                  │                   │              │
│         ▼                  ▼                  ▼                   ▼              │
│   ┌──────────────────────────────────────────────────────────────────────────┐   │
│   │                         REDUX STORE                                      │   │
│   │  ┌────────────┐ ┌────────────┐ ┌─────────────────┐ ┌──────────────────┐  │   │
│   │  │ clm        │ │ auth       │ │ cubicModels     │ │ contentRenderer  │  │   │
│   │  │ Slice      │ │ Slice      │ │ Slice           │ │ Slice            │  │   │
│   │  ├────────────┤ ├────────────┤ ├─────────────────┤ ├──────────────────┤  │   │
│   │  │ components │ │ user       │ │ Context         │ │ currentContent   │  │   │
│   │  │ events     │ │ token      │ │ Goal            │ │ renderMode       │  │   │
│   │  │ metrics    │ │ session    │ │ Success         │ │ history          │  │   │
│   │  └────────────┘ └────────────┘ └─────────────────┘ └──────────────────┘  │   │
│   └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### REPL → Redux Mapping

| REPL Phase | Redux Equivalent | Theatre Action | Code Location |
|------------|------------------|----------------|---------------|
| **READ** | `dispatch(action)` | User selects object | `ui.js` → `switchObject()` |
| **EVALUATE** | `reducer(state, action)` | Load JSON, create mesh | `object-loader.js` |
| **PRINT** | `store.getState()` | Render to WebGL canvas | `scene.js` |
| **LOOP** | `store.subscribe()` | Animate & wait for next action | `main.js` → `animate()` |

---

## 🛡️ Cache Management: The Versioning Protocol

To ensure consistent performance and immediate updates across the decentralized network, the ABC Theatre implements a **Modular Versioning Protocol** (`?v=N`):

1.  **Entry Point Versioning**: `Theater_Example.html` loads `main.js?v=10`.
2.  **Modular Propagation**: `main.js` imports all internal components (`scene.js`, `objects.js`, etc.) with matching version strings.
3.  **Asset Refresh**: Textures (e.g., `science_of_governance.png?v=7`) and logos include versioning to bypass browser caching and ensure the latest "Ground Truth" is visible.

This arithmetized caching ensures that a "Hard Refresh" is rarely needed for the user to see the latest state of the Theatre.

### Integrating with LandingPage Redux Store

The 3D Theatre can be integrated with the existing Redux store (`/js/redux/store.js`) to enable:

#### 1. **Theatre Slice** (Proposed)

```javascript
// js/redux/slices/theatre-slice.js
import { createSlice } from '@reduxjs/toolkit';

const theatreSlice = createSlice({
  name: 'theatre',
  initialState: {
    currentObject: 'teapot',      // Sum Type choice
    lighting: 'studio',           // Lighting preset
    camera: 'default',            // Camera position
    isAnimating: false,           // Animation lock
    objectRegistry: {},           // Loaded JSON definitions
    history: []                   // Action audit trail
  },
  reducers: {
    selectObject: (state, action) => {
      state.history.push({ type: 'SELECT', payload: action.payload, time: Date.now() });
      state.currentObject = action.payload;
    },
    setLighting: (state, action) => {
      state.lighting = action.payload;
    },
    registerObject: (state, action) => {
      state.objectRegistry[action.payload.id] = action.payload.definition;
    }
  }
});

export const { selectObject, setLighting, registerObject } = theatreSlice.actions;
export default theatreSlice.reducer;
```

#### 2. **Bridge Pattern** (Current → Redux)

The Theatre can communicate with Redux via `window.__REDUX_STORE__`:

```javascript
// In ui.js - dispatching to Redux
handleObjectSelect(objectType) {
  // Current Theatre action
  this.app.switchObject(objectType);
  
  // Redux integration (if available)
  if (window.__REDUX_STORE__) {
    window.__REDUX_STORE__.dispatch({
      type: 'theatre/selectObject',
      payload: objectType
    });
  }
}
```

#### 3. **Cubical Logic Model Integration**

The `cubicModels` slice aligns perfectly with the Theatre's temporal structure:

| CLM Dimension | Theatre Mapping | Redux State |
|---------------|-----------------|-------------|
| **Context** | Current scene state | `cubicModels.context` |
| **Goal** | Target object/animation | `cubicModels.goal` |
| **Success** | Render completion | `cubicModels.success` (VCard witness) |

### Benefits of Redux Integration

1. **Single Source of Truth**: All Theatre state in one predictable store
2. **Time-Travel Debugging**: Redux DevTools for inspecting state changes
3. **Middleware Support**: `clmMiddleware` can intercept Theatre actions
4. **Cross-Component Sync**: Theatre state visible to other LandingPage components
5. **Audit Trail**: Action history stored in `history[]` for VCard generation

## Extending the Theatre

### Adding a New Object (Sum Type Extension)

1. **Create a JSON definition** in `data/objects/`:

```json
{
  "$schema": "./schema.json",
  "id": "my-object",
  "metadata": {
    "icon": "🎯",
    "label": "My Object",
    "description": "A new information carrier"
  },
  "materials": { ... },
  "children": [ ... ]
}
```

2. **Register in `config.js`**:

```javascript
objects: {
  myObject: {
    icon: '🎯',
    label: 'My Object',
    factory: 'createMyObject'  // or reference JSON loader
  }
}
```

3. **The stage automatically accepts the new carrier**—no code changes needed in the core logic.

### Adding a New Texture (Product Type Extension)

1. Add image to `textures/`
2. Reference in JSON: `"texture": { "type": "image", "url": "textures/my-texture.jpg" }`

---

## Concurrent Stagecraft: SMC Foundation

The Theatre is governed by **Symmetric Monoidal Categories (SMC)**:

| Operation | Symbol | Meaning | Example |
|-----------|--------|---------|---------|
| Sequential | `;` | One act enables the next | Load → Animate → Render |
| Parallel | `⊗` | Concurrent composition | Earth ⊗ Clouds ⊗ Moon |
| Symmetry | `σ` | Order independence | Camera ⊗ Lighting = Lighting ⊗ Camera |

---

## Integration Points

### With PKC (Personal Knowledge Container)

This example can be embedded in PKC as an **MCard-addressable component**:

```html
<iframe src="/public/examples/THREEJS_ANIMEJS/Theater_Example.html"></iframe>
```

### With LLMs (Large Language Models)

The JSON data definitions are **LLM-friendly**:
- Schema validation ensures generated content is type-safe
- AI can generate new object definitions that the stage automatically accepts

### With Git (Version Control)

Content-addressable objects enable:
- Collaborative curriculum development
- Version history of learning materials
- Branching for experimental approaches

---

## Technical Specifications

| Component | Version | Role |
|-----------|---------|------|
| Three.js | r147 | WebGL 3D Rendering |
| Anime.js | 3.2.2 | Animation Timeline |
| Tone.js | 14.7.77 | Synthesized Audio |
| All libraries | Local | Offline-capable (`/js/vendor/`) |

---

## Quick Start

```bash
# Serve the project
python3 -m http.server 8000

# Open in browser
open http://localhost:8000/public/examples/THREEJS_ANIMEJS/Theater_Example.html
```

---

## Related Documents

- [3D Theater Component](../../../docs/06-components/3d-theater-component.md) - Technical documentation
- [ABC Theatre](https://obsidian.thk.wiki/...) - Theoretical foundation
- [Type Systems make Illegal State Unrepresentable](https://obsidian.thk.wiki/...) - Type theory background

---

## Status

- **Implementation Status**: ✅ Stable
- **Data-Driven Objects**: ✅ Complete
- **Satellite Textures**: ✅ Earth with 2K imagery
- **Causal Cone & Crystal Ball**: ✅ Integrated
- **Omnidirectional Labeling**: ✅ Complete (4-side branding)
- **Offline Support**: ✅ All vendor libraries local
- **Last Updated**: December 19, 2025 (v12)

---

> **"The Theatre provides the Closure Framing—a bounded interval that 'freezes' the flux into an arithmetized, audited sequence of events."**
