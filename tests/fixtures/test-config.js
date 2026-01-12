/**
 * Test Configuration
 * 
 * Centralized configuration for all Playwright tests.
 * Single source of truth for URLs and ports.
 */

// WebSocket server port (serves both static files and API endpoints)
const WS_SERVER_PORT = 3000;

// Base URLs for different test contexts
const BASE_URL = `http://localhost:${WS_SERVER_PORT}`;
const CLM_DASHBOARD_URL = `${BASE_URL}/archive/html/index-clm-dashboard.html`;
const LANDING_PAGE_URL = `${BASE_URL}/index.html`;
const MUSIC_VISUALIZER_URL = `${BASE_URL}/public/examples/Music/SyncedMusicVisualizerV5.html`;

module.exports = {
    WS_SERVER_PORT,
    BASE_URL,
    CLM_DASHBOARD_URL,
    LANDING_PAGE_URL,
    MUSIC_VISUALIZER_URL,
};
