# ⚡ Quick Start Guide (5 Minutes)

Get the **PKC Landing Page & Responsive Test Workbench** running locally in 5 minutes.

---

## 1. Install Dependencies

Ensure Node.js 18+ is installed, then run:

```bash
cd LandingPage
npm install
```

---

## 2. Start the Development Server

Launch the combined HTTP and WebSocket server:

```bash
npm run dev
```

The server listens on **`http://localhost:3001`**.

---

## 3. Open the Responsive UI Lab

Open your browser to:

```text
http://localhost:3001/responsive-lab.html
```

You will see:
- The **Viewport Stage** containing the target web application.
- The **Lab Toolbar** with device presets (iPhone 16 Pro, Pixel 8, iPad Air, etc.).
- Orientation toggles (**Portrait** / **Landscape**).
- The **Interaction Capture** panel for recording and replaying user events.
- Real-time **Telemetry Gauges** for horizontal bleed, frame timing (60 fps budget), and layout shift (CLS).

---

## 4. Test a Custom LandingPage Target

To test another local web app (such as an Astro dev server or Vite app on port 4321):

```text
http://localhost:3001/responsive-lab.html?target=http://localhost:4321/
```

The lab stage automatically loads the target URL inside the containment wrapper and adjusts scaling seamlessly.

---

## 5. Run Verification Tests

Run the test suite to verify system integrity:

```bash
# Unit tests (73 tests)
npm run test:unit

# Systematic 16-device sweep
npm run test:responsive

# Deterministic Playwright replay
npm run test:replay

# Conformance suite & responsive certification
npm run test:conformance
```

---

## 6. Next Steps

- Explore the [User Guide](OPEN_AND_USE.md) for detailed workbench operations.
- Review [Architecture Overview](../01-architecture/README.md) to understand the monorepo design.
- Read the [Testing Infrastructure Guide](../08-testing/DEVICE_SENSITIVE_TESTING_INFRASTRUCTURE.md) for advanced Playwright integration.
