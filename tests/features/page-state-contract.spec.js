import { expect, test } from '@playwright/test';

const SURFACES = [
  { route: '/responsive-lab.html', placeId: 'p_page_responsive_lab' },
  { route: '/?noredirect=1', placeId: 'p_view_index_mcard_viewer' },
  { route: '/app.html', placeId: 'p_page_app' },
  { route: '/sprint-registry.html', placeId: 'p_page_sprint_registry' },
  { route: '/fiber-inspector.html', placeId: 'p_page_fiber_inspector' },
  { route: '/fiber-conformance.html', placeId: 'p_page_fiber_conformance' }
];

for (const surface of SURFACES) {
  test(`${surface.route} reports the page state contract`, async ({ page }) => {
    await page.goto(surface.route, { waitUntil: 'domcontentloaded' });
    const body = page.locator('body');
    await expect(body).toHaveAttribute('data-net-id', 'landingpage-workbench-net');
    await expect(body).toHaveAttribute('data-place-id', surface.placeId);
    await expect(body).toHaveAttribute('data-boot-nonce', /[a-z0-9-]{8,}/i);
    await expect(body).not.toHaveAttribute('data-page-state', 'loading', { timeout: 15000 });
    await expect(page.locator('#page-status')).toHaveAttribute('role', 'status');
    await expect(page.locator('#page-alert')).toHaveAttribute('role', 'alert');
  });
}

test('the portal redirect lands on the lab place, not the portal place', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/responsive-lab\.html$/);
  await expect(page.locator('body')).toHaveAttribute('data-place-id', 'p_page_responsive_lab');
});

test('islands report their own state and the recorder state is visible', async ({ page }) => {
  await page.goto('/responsive-lab.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).not.toHaveAttribute('data-page-state', 'loading', { timeout: 15000 });

  const islands = page.locator('[data-island]');
  const count = await islands.count();
  expect(count).toBeGreaterThanOrEqual(7);
  for (let i = 0; i < count; i += 1) {
    const island = islands.nth(i);
    await expect(island).toHaveAttribute('data-island-state', /^(mounting|ready|busy|empty|error)$/);
    const id = await island.getAttribute('data-island');
    if (id === 'mcard-result') {
      await expect(island).toHaveAttribute('data-island-state', /^(empty|ready|error)$/, { timeout: 15000 });
    } else if (id !== 'spa-test-workflow') {
      await expect(island).toHaveAttribute('data-island-state', 'ready', { timeout: 15000 });
    }
  }

  const ribbon = page.locator('#lab-recording-ribbon');
  await expect(ribbon).toHaveAttribute('data-recorder-state', /^(IDLE|RECORDING|PAUSED|FINALIZED)$/);
});

test('the page exposes one bounded net report and records a fired transition', async ({ page }) => {
  await page.goto('/responsive-lab.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).not.toHaveAttribute('data-page-state', 'loading', { timeout: 15000 });

  const report = await page.evaluate(() => ({
    isArray: Array.isArray(window.__netReport),
    length: window.__netReport?.length,
    state: document.body.dataset.pageState,
    place: document.body.dataset.placeId
  }));
  expect(report.isArray).toBe(true);
  expect(report.length).toBeLessThanOrEqual(200);
  expect(report.place).toBe('p_page_responsive_lab');
  expect(report.state).toBe('ready');
});

test('a wrong declared place fails the build check', async ({}) => {
  const { checkDeclaredPlaceIds } = await import('../../src/integrations/net-parity.mjs');
  const { loadNetEnvelope } = await import('../../scripts/check-net.mjs');
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'place-ids-'));
  fs.writeFileSync(
    path.join(dir, 'index.astro'),
    '<WorkbenchLayout placeIds={[\'p_not_a_place\']}></WorkbenchLayout>'
  );
  const violations = checkDeclaredPlaceIds({
    rootDir: process.cwd(),
    pagesDir: dir,
    envelope: loadNetEnvelope(path.join(process.cwd(), 'src/net/workbench-net.yaml'))
  });
  expect(violations.length).toBeGreaterThan(0);
  expect(violations[0].detail).toContain('p_not_a_place');
});
