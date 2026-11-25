import { chromium } from '@playwright/test';
import { test, expect, SPA_FIXTURE_PATH } from '../fixtures/app-fixtures.js';

const HASH_BY_PLACE = Object.freeze({
  p_spa_overview: '#overview',
  p_spa_details: '#details',
  p_spa_missing_transition: '#missing-transition'
});
const CLICKS_PAST_FLOOD_LIMIT = 260;
const FLOOD_WARNING = /Throttling navigation to prevent the browser from hanging/;

test.describe('SPRINT-BPV-00: SPA fixture under Chrome history flood protection', () => {
  test('BPV-00-E2E-01: the view follows the URL when Chrome drops history updates', async ({ baseURL }) => {
    test.setTimeout(120000);
    // Playwright disables this protection by default. Bombadil and real browsers keep it.
    const browser = await chromium.launch({ ignoreDefaultArgs: ['--disable-ipc-flooding-protection'] });
    try {
      const page = await browser.newPage();
      const warnings = [];
      page.on('console', (msg) => {
        if (FLOOD_WARNING.test(msg.text())) warnings.push(msg.text());
      });
      await page.goto(new URL(SPA_FIXTURE_PATH, baseURL).href);

      const readView = () =>
        page.evaluate(() => ({
          place: document.querySelector('[data-testid="spa-app-root"]').getAttribute('data-place-id'),
          hash: location.hash
        }));

      const burstMismatch = await page.evaluate(
        ({ count, hashByPlace }) => {
          for (let i = 0; i < count; i += 1) {
            const root = document.querySelector('[data-testid="spa-app-root"]');
            const place = root.getAttribute('data-place-id');
            const testId = place === 'p_spa_details' ? 'btn-back-overview' : 'btn-open-details';
            document.querySelector(`[data-testid="${testId}"]`).click();
            const nextPlace = root.getAttribute('data-place-id');
            if (location.hash !== hashByPlace[nextPlace]) {
              return { step: i + 1, nextPlace, hash: location.hash };
            }
          }
          return null;
        },
        { count: CLICKS_PAST_FLOOD_LIMIT, hashByPlace: HASH_BY_PLACE }
      );
      expect(burstMismatch, 'burst clicks keep hash aligned with shown place').toBeNull();

      // Verify real user clicks under active Chrome history throttling also keep view and URL aligned.
      for (let i = 0; i < 10; i += 1) {
        const before = await readView();
        const testId = before.place === 'p_spa_details' ? 'btn-back-overview' : 'btn-open-details';
        await page.getByTestId(testId).click();
        const view = await readView();
        expect(view.hash, `throttled click ${i + 1} leaves the hash matching the shown place`).toBe(HASH_BY_PLACE[view.place]);
      }

      expect(warnings.length, 'Chrome throttled history updates during the run').toBeGreaterThan(0);
    } finally {
      await browser.close();
    }
  });
});
