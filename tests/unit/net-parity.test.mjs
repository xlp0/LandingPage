import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, it } from 'node:test';
import { loadNetEnvelope } from '../../scripts/check-net.mjs';
import {
  DEFAULT_NET_PATH,
  discoverAstroActions,
  evaluateNetParity,
  extractEndpointMethodsFromSource,
  extractInternalHrefsFromHtml,
  netParityIntegration,
  normalizeAstroPageRoute
} from '../../src/integrations/net-parity.mjs';

const APPROVED_PAGE_PLACES = [
  'p_page_index',
  'p_page_responsive_lab',
  'p_page_app',
  'p_page_sprint_registry',
  'p_page_fiber_inspector',
  'p_page_fiber_conformance'
];

function buildMigratedFixtureEnvelope() {
  const envelope = structuredClone(loadNetEnvelope(DEFAULT_NET_PATH));
  for (const placeId of APPROVED_PAGE_PLACES) {
    envelope.bindings.places[placeId].migrationState = 'astro-wrapped';
  }
  return envelope;
}

function buildBaselineRoutes() {
  return [
    { origin: 'project', type: 'page', pattern: '/', entrypoint: 'src/pages/index.astro' },
    { origin: 'project', type: 'page', pattern: '/responsive-lab', entrypoint: 'src/pages/responsive-lab.astro' },
    { origin: 'project', type: 'page', pattern: '/app', entrypoint: 'src/pages/app.astro' },
    { origin: 'project', type: 'page', pattern: '/sprint-registry', entrypoint: 'src/pages/sprint-registry.astro' },
    { origin: 'project', type: 'page', pattern: '/fiber-inspector', entrypoint: 'src/pages/fiber-inspector.astro' },
    { origin: 'project', type: 'page', pattern: '/fiber-conformance', entrypoint: 'src/pages/fiber-conformance.astro' },
    { origin: 'internal', type: 'page', pattern: '/404', entrypoint: 'astro/components/404.astro' },
    { origin: 'internal', type: 'endpoint', pattern: '/_image', entrypoint: 'astro/assets/endpoint/node' }
  ];
}

function buildBaselineHtmlMap() {
  return new Map([
    [
      '/',
      `<!DOCTYPE html><html><body>
        <a href="index.html">Home</a>
        <a href="app.html">App</a>
        <a href="responsive-lab.html">Lab</a>
        <a href="#details">Anchor</a>
        <a href="https://example.org/docs">External</a>
        <script>const tpl = '<a href="/ignored-in-script.html">x</a>';</script>
      </body></html>`
    ],
    [
      '/responsive-lab.html',
      `<!DOCTYPE html><html><body>
        <a href="/">Home</a>
        <a href="app.html">MCard Manager</a>
      </body></html>`
    ],
    ['/app.html', '<!DOCTYPE html><html><body><button onclick="window.location.href=\'/\'">Landing</button></body></html>'],
    ['/sprint-registry.html', '<!DOCTYPE html><html><body><main id="registry"></main></body></html>'],
    ['/fiber-inspector.html', '<!DOCTYPE html><html><body><main id="inspector"></main></body></html>'],
    ['/fiber-conformance.html', '<!DOCTYPE html><html><body><main id="conformance"></main></body></html>']
  ]);
}

describe('Astro net-parity integration contracts (GQC-02B)', () => {
  it('passes when all 6 astro-wrapped Places, routes, and declared internal hrefs match workbench-net.yaml', () => {
    const envelope = buildMigratedFixtureEnvelope();
    const report = evaluateNetParity({
      envelope,
      routes: buildBaselineRoutes(),
      builtHtmlByRoute: buildBaselineHtmlMap(),
      runExpressEndpointAudit: false
    });

    assert.equal(report.valid, true, JSON.stringify(report.violations));
    assert.deepEqual(report.checkedPages.sort(), [...APPROVED_PAGE_PLACES].sort());
    assert.ok(report.triggeredTransitionIds.includes('t_link_viewer_to_app'));
    assert.ok(report.triggeredTransitionIds.includes('t_link_lab_to_index'));
    assert.ok(report.triggeredTransitionIds.includes('t_link_lab_to_app'));
    assert.ok(report.untriggeredTransitions.some((t) => t.transitionId === 't_link_app_to_index'));
    assert.ok(
      report.untriggeredTransitions.some((t) => t.transitionId === 't_redirect_index_to_lab'),
      'JS-driven redirect transition should appear in untriggeredTransitions report without failing build'
    );
  });

  it('GQC-02B-UNIT-01: fails naming the route and rule when an Astro page route has no page or view Place binding', () => {
    const envelope = buildMigratedFixtureEnvelope();
    const routes = [
      ...buildBaselineRoutes(),
      { origin: 'project', type: 'page', pattern: '/unregistered-console', entrypoint: 'src/pages/unregistered-console.astro' }
    ];

    const report = evaluateNetParity({
      envelope,
      routes,
      builtHtmlByRoute: buildBaselineHtmlMap(),
      runExpressEndpointAudit: false
    });

    assert.equal(report.valid, false);
    const violation = report.violations.find((v) => v.rule === 'unbound-astro-route');
    assert.ok(violation, 'expected unbound-astro-route violation');
    assert.equal(violation.route, '/unregistered-console.html');
    assert.match(violation.message, /\/unregistered-console\.html/);
  });

  it('fails with missing-astro-page when a Place in astro-wrapped or astro-islands has no built Astro page', () => {
    const envelope = buildMigratedFixtureEnvelope();
    envelope.bindings.places.p_page_fiber_conformance.migrationState = 'astro-islands';
    const routes = buildBaselineRoutes().filter((r) => r.pattern !== '/fiber-conformance');

    const report = evaluateNetParity({
      envelope,
      routes,
      builtHtmlByRoute: buildBaselineHtmlMap(),
      runExpressEndpointAudit: false
    });

    assert.equal(report.valid, false);
    const violation = report.violations.find((v) => v.rule === 'missing-astro-page');
    assert.ok(violation, 'expected missing-astro-page violation');
    assert.equal(violation.placeId, 'p_page_fiber_conformance');
    assert.equal(violation.route, '/fiber-conformance.html');
  });

  it('GQC-02B-UNIT-02: fails naming the Place, href, and rule when built HTML contains an undeclared internal <a href>', () => {
    const envelope = buildMigratedFixtureEnvelope();
    const htmlMap = buildBaselineHtmlMap();
    htmlMap.set(
      '/responsive-lab.html',
      '<!DOCTYPE html><html><body><a href="/rogue-internal-page.html?from=lab">Rogue</a></body></html>'
    );

    const report = evaluateNetParity({
      envelope,
      routes: buildBaselineRoutes(),
      builtHtmlByRoute: htmlMap,
      runExpressEndpointAudit: false
    });

    assert.equal(report.valid, false);
    const violation = report.violations.find((v) => v.rule === 'undeclared-internal-href');
    assert.ok(violation, 'expected undeclared-internal-href violation');
    assert.equal(violation.placeId, 'p_page_responsive_lab');
    assert.equal(violation.href, '/rogue-internal-page.html?from=lab');
    assert.match(violation.message, /p_page_responsive_lab/);
    assert.match(violation.message, /\/rogue-internal-page\.html\?from=lab/);
  });

  it('GQC-02B-UNIT-03: fails when an Astro endpoint or Action has no server-call-request binding and no not-ui-reachable mark, and passes once bound or marked', () => {
    const envelope = buildMigratedFixtureEnvelope();
    const routesWithEndpoint = [
      ...buildBaselineRoutes(),
      {
        origin: 'project',
        type: 'endpoint',
        pattern: '/api/astro-probe',
        methods: ['GET', 'POST'],
        entrypoint: 'src/pages/api/astro-probe.js'
      }
    ];
    const actions = [{ name: 'syncDraftCard', entrypoint: 'src/actions/index.js' }];

    const failingReport = evaluateNetParity({
      envelope,
      routes: routesWithEndpoint,
      builtHtmlByRoute: buildBaselineHtmlMap(),
      actions,
      runExpressEndpointAudit: false
    });

    assert.equal(failingReport.valid, false);
    assert.ok(
      failingReport.violations.some((v) => v.rule === 'unbound-astro-endpoint' && v.id === 'GET /api/astro-probe'),
      'expected unbound-astro-endpoint for GET /api/astro-probe'
    );
    assert.ok(
      failingReport.violations.some((v) => v.rule === 'unbound-astro-endpoint' && v.id === 'POST /api/astro-probe'),
      'expected unbound-astro-endpoint for POST /api/astro-probe'
    );
    assert.ok(
      failingReport.violations.some((v) => v.rule === 'unbound-astro-action' && v.id === 'syncDraftCard'),
      'expected unbound-astro-action for syncDraftCard'
    );

    const coveredEnvelope = buildMigratedFixtureEnvelope();
    coveredEnvelope.bindings.nonUiEndpoints.push(
      {
        httpMethod: 'GET',
        httpPath: '/api/astro-probe',
        status: 'not-ui-reachable',
        owner: 'SPRINT-GQC-02B',
        reason: 'Probe endpoint covered by contract test'
      },
      {
        httpMethod: 'POST',
        httpPath: '/api/astro-probe',
        status: 'not-ui-reachable',
        owner: 'SPRINT-GQC-02B',
        reason: 'Probe write endpoint covered by contract test'
      },
      {
        action: 'syncDraftCard',
        status: 'not-ui-reachable',
        owner: 'SPRINT-GQC-02B',
        reason: 'Server action covered by contract test'
      }
    );

    const passingReport = evaluateNetParity({
      envelope: coveredEnvelope,
      routes: routesWithEndpoint,
      builtHtmlByRoute: buildBaselineHtmlMap(),
      actions,
      runExpressEndpointAudit: false
    });

    assert.equal(passingReport.valid, true, JSON.stringify(passingReport.violations));
  });

  it('delegates net structural invariants to validateNetEnvelope so broken arcs fail net-parity', () => {
    const envelope = buildMigratedFixtureEnvelope();
    envelope.topology.transitions[0].outputs.push('p_nonexistent_place');

    const report = evaluateNetParity({
      envelope,
      routes: buildBaselineRoutes(),
      builtHtmlByRoute: buildBaselineHtmlMap(),
      runExpressEndpointAudit: false
    });

    assert.equal(report.valid, false);
    assert.ok(report.violations.some((v) => v.rule === 'net-envelope-invalid'));
  });

  it('runs netParityIntegration hooks end-to-end on built HTML files and rewrites .html dev URLs for Astro pages', async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gqc-net-parity-'));
    try {
      const pagesDir = path.join(tmpRoot, 'src', 'pages');
      const clientDir = path.join(tmpRoot, 'dist', 'client');
      fs.mkdirSync(pagesDir, { recursive: true });
      fs.mkdirSync(clientDir, { recursive: true });

      const slugs = ['index', 'responsive-lab', 'app', 'sprint-registry', 'fiber-inspector', 'fiber-conformance'];
      for (const slug of slugs) {
        fs.writeFileSync(path.join(pagesDir, `${slug}.astro`), '<html></html>');
      }

      for (const [route, html] of buildBaselineHtmlMap().entries()) {
        const { htmlRelPath } = normalizeAstroPageRoute(route, 'file');
        fs.writeFileSync(path.join(clientDir, htmlRelPath), html);
      }

      const netYamlPath = path.join(tmpRoot, 'workbench-net.json');
      fs.writeFileSync(netYamlPath, JSON.stringify(buildMigratedFixtureEnvelope(), null, 2));

      const integration = netParityIntegration({ netPath: netYamlPath, rootDir: tmpRoot });
      integration.hooks['astro:config:done']({ config: { build: { format: 'file' } } });
      integration.hooks['astro:routes:resolved']({ routes: buildBaselineRoutes() });

      const logs = [];
      await integration.hooks['astro:build:done']({
        dir: pathToFileURL(`${clientDir}/`),
        logger: { info: (msg) => logs.push(msg) }
      });
      assert.equal(logs.length, 1);
      assert.match(logs[0], /^PASS pages=6/);

      let capturedMw = null;
      integration.hooks['astro:server:setup']({
        server: { middlewares: { use: (fn) => { capturedMw = fn; } } }
      });
      const reqLab = { url: '/responsive-lab.html?target=foo' };
      capturedMw(reqLab, {}, () => {});
      assert.equal(reqLab.url, '/responsive-lab?target=foo');

      const reqIndex = { url: '/index.html?noredirect=1' };
      capturedMw(reqIndex, {}, () => {});
      assert.equal(reqIndex.url, '/?noredirect=1');

      const reqLegacy = { url: '/pkc-docs-index.html' };
      capturedMw(reqLegacy, {}, () => {});
      assert.equal(reqLegacy.url, '/pkc-docs-index.html');

      fs.writeFileSync(
        path.join(clientDir, 'app.html'),
        '<!DOCTYPE html><html><body><a href="/undeclared.html">Bad</a></body></html>'
      );
      await assert.rejects(
        () =>
          integration.hooks['astro:build:done']({
            dir: pathToFileURL(`${clientDir}/`),
            logger: { info: () => {} }
          }),
        /rule=undeclared-internal-href/
      );
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('extracts endpoint methods and Astro Actions from source files', () => {
    const methods = extractEndpointMethodsFromSource(
      'export async function GET() {}\nexport const POST = async () => {};'
    );
    assert.deepEqual(methods, ['GET', 'POST']);
    assert.deepEqual(extractInternalHrefsFromHtml('<a href="#x"></a><a href="/app.html">App</a>'), ['/app.html']);

    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gqc-actions-'));
    try {
      const actionsDir = path.join(tmpRoot, 'src', 'actions');
      fs.mkdirSync(actionsDir, { recursive: true });
      fs.writeFileSync(
        path.join(actionsDir, 'index.js'),
        'export const server = { saveCard: defineAction({ input: null, handler: async () => {} }) };'
      );
      const discovered = discoverAstroActions(tmpRoot);
      assert.deepEqual(discovered.map((a) => a.name), ['saveCard']);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});
