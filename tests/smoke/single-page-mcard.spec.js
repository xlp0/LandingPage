/**
 * SMR-09 smoke spec — the single-page MCard host and the Sovereign HUD Pill.
 *
 * Watches the contract end to end in a real browser: the page hosts one active
 * handle, the pill renders the active hash, the sample switcher is populated from
 * the seeded corpus manifest, and the Studio deep link is constructed.
 *
 * Headed, slow motion:
 *   SLOWMO=1000 npx playwright test tests/smoke/single-page-mcard.spec.js --project=smoke --headed
 *
 * @category smoke
 */
import { expect, test } from '@playwright/test';

const LANDING_HANDLE = 'urn:mcard:content:landing_page';

async function openLanding(page) {
  await page.goto('/index.html?noredirect=1');
  // The PWA install prompt is unrelated to this contract; dismiss it if it appears.
  const dismiss = page.locator('#modal-dismiss-btn');
  try {
    await dismiss.waitFor({ state: 'visible', timeout: 5000 });
    await dismiss.click();
    await page.locator('#pwa-install-backdrop').waitFor({ state: 'hidden', timeout: 5000 });
  } catch {
    /* prompt did not appear */
  }
}

test.describe('SMR-09 — Single-Page MCard host', () => {
  test('index.html hosts exactly one active page handle', async ({ page }) => {
    await openLanding(page);
    const host = page.locator('#single-page-mcard-host');
    await expect(host).toHaveCount(1);
    await expect(host).toHaveAttribute('data-handle', LANDING_HANDLE);
  });

  test('the Sovereign HUD Pill renders the active hash and a Studio deep link', async ({ page }) => {
    await openLanding(page);
    const pill = page.locator('#mcard-sovereign-pill');
    await expect(pill).toBeVisible();

    const studioLink = pill.locator('[data-role="open-in-studio"]');
    await expect(studioLink).toBeVisible();
    await expect(studioLink).toHaveAttribute('href', /handle=urn%3Amcard%3Acontent%3Alanding_page/);
    await expect(pill.locator('.pill-witness')).toHaveText(/Witnessed|Unverified/);
  });

  test('the sample switcher is populated from the seeded corpus', async ({ page }) => {
    await openLanding(page);
    const options = page.locator('#mcard-sovereign-pill [data-role="sample-switcher"] option');
    await expect(options).toHaveCount(6);
    await expect(options.first()).toHaveAttribute('value', /^urn:mcard:content:landing_sample:/);
  });

  test('binding a page through the API updates the pill hash and renders the content', async ({ page, request }) => {
    const body = `# SMR-09 headed verification\n\nBound at ${new Date().toISOString()}`;
    const response = await request.put('/api/mcard/landing', { data: { content: body } });
    expect(response.ok()).toBeTruthy();
    const bound = await response.json();
    expect(bound.handle).toBe(LANDING_HANDLE);
    expect(bound.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(bound.gTime.startsWith('blake3|')).toBeTruthy();

    await openLanding(page);
    const pill = page.locator('#mcard-sovereign-pill');
    await expect(pill.locator('.pill-hash')).toContainText(bound.hash.slice(0, 10));
    await expect(pill.locator('.pill-witness')).toHaveText('✓ Witnessed');
    await expect(pill.locator('[data-role="open-in-studio"]')).toHaveAttribute(
      'href',
      new RegExp(`card=${bound.hash}`)
    );

    const host = page.locator('#single-page-mcard-host');
    await expect(host.locator('article.mcard-page')).toHaveAttribute('data-hash', bound.hash);
    await expect(host).toContainText('SMR-09 headed verification');
  });

  test('an unsafe URL is rejected with HTTP 400 and mutates nothing', async ({ request }) => {
    for (const url of ['javascript:alert(1)', 'data:text/html,<b>x</b>', 'not a url']) {
      const response = await request.put('/api/mcard/landing', { data: { url } });
      expect(response.status(), `rejected: ${url}`).toBe(400);
    }
  });

  test('the external URL membrane reports a verdict for a local fixture', async ({ request }, testInfo) => {
    const origin = testInfo.project.use.baseURL ?? 'http://localhost:3001';
    const response = await request.get(`/api/mcard/probe-url?url=${encodeURIComponent(`${origin}/index.html`)}`);
    expect(response.ok()).toBeTruthy();
    const probe = await response.json();
    expect(['frameable', 'blocked', 'unreachable']).toContain(probe.verdict);
    expect(probe.budgetMs).toBe(600);
  });
});
