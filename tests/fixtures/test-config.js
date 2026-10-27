import {
  ASTRO_DEV_PORT,
  EXPRESS_DEFAULT_PORT,
  PLAYWRIGHT_DEFAULT_PORT,
  resolvePlaywrightServerContract,
} from './server-contract.js';

export { ASTRO_DEV_PORT, EXPRESS_DEFAULT_PORT, PLAYWRIGHT_DEFAULT_PORT };

export const CLM_DASHBOARD_PATH = '/archive/html/index-clm-dashboard.html';
export const LANDING_PAGE_PATH = '/index.html';
export const RESPONSIVE_LAB_PATH = '/responsive-lab.html';
export const APP_PAGE_PATH = '/app.html';
export const MUSIC_VISUALIZER_PATH = '/public/examples/Music/SyncedMusicVisualizerV5.html';

export const ROOT_PAGE_CHARACTERIZATIONS = Object.freeze([
  Object.freeze({
    pagePath: 'index.html',
    specPath: 'tests/smoke/root-index.spec.js',
    surfaceId: 'workbench-landing-portal',
    placeId: 'p_workbench_landing_portal',
    candidateNetPlaceId: 'p_wb_landing_portal',
    route: '/index.html?noredirect=1',
    redirectRoute: '/',
    redirectTarget: '/responsive-lab.html',
    expectedTitle: 'GovTech Platform | Mission Control',
    redirectTitle: 'GovTech OS - Responsive UI Lab (Full-Window Viewport Workbench)',
    expectedSameOriginLinks: Object.freeze(['/', '/app.html', '/index.html', '/responsive-lab.html']),
  }),
  Object.freeze({
    pagePath: 'responsive-lab.html',
    specPath: 'tests/smoke/root-responsive-lab.spec.js',
    surfaceId: 'workbench-responsive-lab',
    placeId: 'p_workbench_responsive_lab',
    candidateNetPlaceId: 'p_wb_responsive_lab',
    route: '/responsive-lab.html',
    expectedTitle: 'GovTech OS - Responsive UI Lab (Full-Window Viewport Workbench)',
    expectedSameOriginLinks: Object.freeze(['/', '/app.html']),
  }),
  Object.freeze({
    pagePath: 'app.html',
    specPath: 'tests/smoke/root-app.spec.js',
    surfaceId: 'workbench-legacy-mission-control',
    placeId: 'p_legacy_mission_control',
    candidateNetPlaceId: 'p_wb_mission_control',
    route: '/app.html',
    expectedTitle: 'MCard Manager',
    expectedSameOriginLinks: Object.freeze([]),
  }),
  Object.freeze({
    pagePath: 'fiber-conformance.html',
    specPath: 'tests/smoke/root-fiber-conformance.spec.js',
    surfaceId: 'workbench-fiber-conformance',
    placeId: 'p_diag_fiber_conformance',
    candidateNetPlaceId: 'p_wb_fiber_conformance',
    route: '/fiber-conformance.html',
    expectedTitle: 'Fiber Conformance Harness',
    expectedSameOriginLinks: Object.freeze([]),
  }),
  Object.freeze({
    pagePath: 'fiber-inspector.html',
    specPath: 'tests/smoke/root-fiber-inspector.spec.js',
    surfaceId: 'workbench-fiber-inspector',
    placeId: 'p_diag_fiber_inspector',
    candidateNetPlaceId: 'p_wb_fiber_inspector',
    route: '/fiber-inspector.html',
    expectedTitle: 'Fiber Inspector \u2014 the correctness panel',
    expectedSameOriginLinks: Object.freeze([]),
  }),
  Object.freeze({
    pagePath: 'sprint-registry.html',
    specPath: 'tests/smoke/root-sprint-registry.spec.js',
    surfaceId: 'workbench-sprint-registry',
    placeId: 'p_diag_sprint_registry',
    candidateNetPlaceId: 'p_wb_sprint_registry',
    route: '/sprint-registry.html',
    expectedTitle: 'CLM Sprint Registry \u2014 SSoT Display Projection',
    expectedSameOriginLinks: Object.freeze([]),
  }),
  Object.freeze({
    pagePath: 'pkc-docs-index.html',
    specPath: 'tests/smoke/root-pkc-docs-index.spec.js',
    surfaceId: 'workbench-pkc-docs-index',
    placeId: 'p_legacy_pkc_docs_index',
    candidateNetPlaceId: 'p_wb_pkc_docs_index',
    route: '/pkc-docs-index.html',
    expectedTitle: 'PKC Design Documents',
    expectedSameOriginLinks: Object.freeze([
      '/pkc-viewer.html?doc=MVP%20Cards%20%E2%80%94%20Design%20Thesis%20for%20Sovereign%20Knowledge%20Networks.md',
      '/pkc-viewer.html?doc=PKC%20as%20the%20Network.md',
      '/pkc-viewer.html?doc=Personal%20Knowledge%20Container.md',
      '/pkc-viewer.html?doc=TikZ-CD-Examples.md',
      '/pkc-viewer.html?doc=Yoneda%20Arithmetic.md',
    ]),
  }),
]);

export function resolveTestConfig(env = process.env) {
  const contract = resolvePlaywrightServerContract(env);
  const base = contract.baseURL;
  return {
    TEST_PORT: contract.port,
    WS_SERVER_PORT: contract.port,
    EXPRESS_DEFAULT_PORT,
    ASTRO_DEV_PORT,
    BASE_URL: base,
    CLM_DASHBOARD_PATH,
    LANDING_PAGE_PATH,
    RESPONSIVE_LAB_PATH,
    APP_PAGE_PATH,
    MUSIC_VISUALIZER_PATH,
    CLM_DASHBOARD_URL: `${base}${CLM_DASHBOARD_PATH}`,
    LANDING_PAGE_URL: `${base}${LANDING_PAGE_PATH}`,
    RESPONSIVE_LAB_URL: `${base}${RESPONSIVE_LAB_PATH}`,
    APP_PAGE_URL: `${base}${APP_PAGE_PATH}`,
    MUSIC_VISUALIZER_URL: `${base}${MUSIC_VISUALIZER_PATH}`,
  };
}

const activeConfig = resolveTestConfig(process.env);

export const TEST_PORT = activeConfig.TEST_PORT;
export const WS_SERVER_PORT = activeConfig.WS_SERVER_PORT;
export const BASE_URL = activeConfig.BASE_URL;
export const CLM_DASHBOARD_URL = activeConfig.CLM_DASHBOARD_URL;
export const LANDING_PAGE_URL = activeConfig.LANDING_PAGE_URL;
export const RESPONSIVE_LAB_URL = activeConfig.RESPONSIVE_LAB_URL;
export const APP_PAGE_URL = activeConfig.APP_PAGE_URL;
export const MUSIC_VISUALIZER_URL = activeConfig.MUSIC_VISUALIZER_URL;
