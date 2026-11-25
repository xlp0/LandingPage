import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { filterSprints, groupSprints } from '../../js/ui/registry-view.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../../');
const CANONICAL_WITNESS_PATH = path.join(
  REPO_ROOT,
  'docs/sprints/programs/cdo/witness/cdo-16.fiber-certification.witness.json'
);

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

test.describe('Sprint Registry & Conformance Display Parity (ORC-13)', () => {
  test('1. Registry API serves sprints array and dod.state', async ({ request }) => {
    const res = await request.get('/api/clm/registry');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.registry).toBeDefined();
    expect(Array.isArray(data.registry.sprints)).toBe(true);
    expect(data.registry.sprints.length).toBeGreaterThanOrEqual(90);

    const first = data.registry.sprints[0];
    expect(first.code).toBeDefined();
    expect(first.handle).toBeDefined();
    expect(first.dod).toBeDefined();
    expect(first.dod.state).toMatch(/^(sealed|specification)$/);
  });

  test('2. Registry view renders sealed and specification states distinguishably', async ({ page }) => {
    await page.goto('/sprint-registry.html');
    const status = page.locator('#registry-status');
    await expect(page.locator('body')).toHaveAttribute('data-page-state', 'ready', { timeout: 10000 });

    const sealedCards = page.locator('.sprint-card[data-state="sealed"]');
    const specCards = page.locator('.sprint-card[data-state="specification"]');

    const sealedCount = await sealedCards.count();
    const specCount = await specCards.count();

    expect(sealedCount).toBeGreaterThan(0);
    expect(specCount).toBeGreaterThan(0);

    // Assert visual distinction: badges and border styling
    const firstSealedBadge = sealedCards.first().locator('.state-badge');
    const firstSpecBadge = specCards.first().locator('.state-badge');

    await expect(firstSealedBadge).toHaveText(/sealed/i);
    await expect(firstSealedBadge).toHaveClass(/badge-sealed/);

    await expect(firstSpecBadge).toHaveText(/specification/i);
    await expect(firstSpecBadge).toHaveClass(/badge-specification/);

    // Verify computed visual distinction (color / background)
    const sealedColor = await firstSealedBadge.evaluate(el => window.getComputedStyle(el).color);
    const specColor = await firstSpecBadge.evaluate(el => window.getComputedStyle(el).color);
    expect(sealedColor).not.toBe(specColor);
  });

  test('3. Program artifact route serves sealed original hash-identical to witness', async ({ request }) => {
    const res = await request.get(
      '/api/clm/program-artifact?program=cdo&subdir=witness&file=cdo-16.fiber-certification.witness.json'
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.body();

    const expectedBytes = fs.readFileSync(CANONICAL_WITNESS_PATH);
    const servedHash = sha256(body);
    const expectedHash = sha256(expectedBytes);

    expect(servedHash).toBe(expectedHash);
  });

  test('4. Traversal attempts and invalid paths are refused (400 and 404)', async ({ request }) => {
    // 4a: File traversal rejected before disk call (400)
    const resFileTraversal = await request.get(
      '/api/clm/program-artifact?program=cdo&subdir=conformance&file=../../../etc/passwd'
    );
    expect(resFileTraversal.status()).toBe(400);

    // 4b: Subdirectory traversal rejected by whitelist (400)
    const resSubdirTraversal = await request.get(
      '/api/clm/program-artifact?program=cdo&subdir=../../..&file=witness.json'
    );
    expect(resSubdirTraversal.status()).toBe(400);

    // 4c: Well-formed reference to non-existent file returns 404
    const resNotFound = await request.get(
      '/api/clm/program-artifact?program=cdo&subdir=conformance&file=non-existent-artifact-123.json'
    );
    expect(resNotFound.status()).toBe(404);
  });

  test('5. Renders registry text safely without interpreting HTML tags as markup (PR-DCI-01A)', async ({ page }) => {
    await page.route('**/api/clm/registry', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          registry: {
            sprints: [
              {
                code: 'FIX-01',
                title: 'Host a <pkc-card> island',
                handle: 'urn:pcard:sprint:FIX-01',
                card_type: 'pcard',
                dod: { state: 'sealed', total: 3, vcard_refs: [] }
              }
            ]
          }
        })
      });
    });

    await page.goto('/sprint-registry.html');
    await expect(page.locator('body')).toHaveAttribute('data-page-state', 'ready', { timeout: 10000 });
    await expect(page.locator('.sprint-card[data-code="FIX-01"] .sprint-title')).toHaveText('Host a <pkc-card> island');
    await expect(page.locator('pkc-card')).toHaveCount(0);
  });

  test('6. Groups sprints by program, filters cleanly, persists URL state, deep-links, and fetches once (PR-DCI-01B)', async ({ page, request }) => {
    const apiRes = await request.get('/api/clm/registry');
    expect(apiRes.ok()).toBeTruthy();
    const { registry } = await apiRes.json();
    const sprints = registry.sprints;
    const expectedGroups = groupSprints(sprints);
    const expectedSealed = filterSprints(sprints, { state: 'sealed' });
    const expectedLanding = filterSprints(sprints, { query: 'landingpage' });
    const expectedPkcSealed = filterSprints(sprints, { program: 'PKC', state: 'sealed' });

    let registryRequests = 0;
    await page.route('**/api/clm/registry', async (route) => {
      registryRequests += 1;
      await route.continue();
    });

    await page.goto('/sprint-registry.html');
    await expect(page.locator('body')).toHaveAttribute('data-page-state', 'ready', { timeout: 10000 });

    const sections = page.locator('section[data-testid^="program-"]');
    await expect(sections).toHaveCount(expectedGroups.length);

    // Selecting sealed hides every specification card and updates registry-result.
    await page.getByTestId('registry-filter-state').selectOption('sealed');
    await expect(page.locator('.sprint-card[data-state="specification"]:visible')).toHaveCount(0);
    await expect(page.getByTestId('registry-result')).toHaveAttribute('data-shown', String(expectedSealed.length));
    await expect(page).toHaveURL(/\?state=sealed$/);

    // Search filters by code/title/ref without reloading on Enter.
    const queryInput = page.getByTestId('registry-filter-query');
    await page.getByTestId('registry-filter-state').selectOption('');
    await queryInput.fill('landingpage');
    await queryInput.press('Enter');
    await expect(page.getByTestId('registry-result')).toHaveAttribute('data-shown', String(expectedLanding.length));
    await expect(page.locator('#sprint-PKC-06')).toBeVisible();

    // Empty result surfaces message + Clear filters button.
    await queryInput.fill('__no_sprint_matches_this_token_999__');
    await expect(page.getByTestId('registry-result')).toHaveText('No sprint matches these filters');
    await expect(page.getByTestId('registry-filters-clear')).toBeVisible();
    await page.getByTestId('registry-filters-clear').click();
    await expect(page.getByTestId('registry-result')).toHaveAttribute('data-shown', String(sprints.length));

    // Only one /api/clm/registry request across all filter changes.
    expect(registryRequests).toBe(1);

    // Deep link resets conflicting filter and focuses the target link.
    await page.goto('/sprint-registry.html?state=specification#sprint-PKC-06');
    await expect(page.locator('body')).toHaveAttribute('data-page-state', 'ready', { timeout: 10000 });
    await expect(page.getByTestId('sprint-link-PKC-06')).toBeFocused();
    await expect(page).toHaveURL(/\/sprint-registry\.html#sprint-PKC-06$/);

    // Persists valid query params across reload and ignores invalid state values.
    await page.goto('/sprint-registry.html?program=PKC&state=sealed');
    await expect(page.locator('body')).toHaveAttribute('data-page-state', 'ready', { timeout: 10000 });
    await expect(page.getByTestId('registry-result')).toHaveAttribute('data-shown', String(expectedPkcSealed.length));
    await page.reload();
    await expect(page.locator('body')).toHaveAttribute('data-page-state', 'ready', { timeout: 10000 });
    await expect(page.getByTestId('registry-result')).toHaveAttribute('data-shown', String(expectedPkcSealed.length));

    await page.goto('/sprint-registry.html?state=foo');
    await expect(page.locator('body')).toHaveAttribute('data-page-state', 'ready', { timeout: 10000 });
    await expect(page.getByTestId('registry-result')).toHaveAttribute('data-shown', String(sprints.length));
  });
});
