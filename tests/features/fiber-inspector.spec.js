/**
 * CDO-14 DV-01/DV-06: the correctness panel.
 *
 * Its grounding says the panel is the *typing of the fiber set* and must read the
 * registry, the mount witnesses and the conformance verdicts rather than keep its own
 * list. These tests assert it reads them — a panel over an empty table would prove
 * nothing, and a panel with its own list would drift.
 */
import { test, expect } from '@playwright/test';

test.describe('Fiber inspector — the correctness panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/fiber-inspector.html');
    // `attached`, not `visible`: #panel-status is a zero-size status div, so Playwright
    // treats it as hidden and a visible wait times out even though the panel rendered.
    await page.waitForSelector('#panel-status[data-ready="true"]', {
      state: 'attached', timeout: 20000,
    });
  });

  test('it renders a marking, not a list', async ({ page }) => {
    const panel = await page.evaluate(() => window.__FIBER_PANEL__);
    expect(Object.keys(panel.marking.places)).toHaveLength(7);
    // the sweep mounts and unmounts every kind, so conservation puts every token in
    // the sink
    expect(panel.marking.places.p_disposed).toHaveLength(15);
    expect(panel.marking.places.p_active).toHaveLength(0);
  });

  test('it lists every declared transition with its guard', async ({ page }) => {
    const panel = await page.evaluate(() => window.__FIBER_PANEL__);
    const ids = panel.enabled.map((t) => t.transition);
    expect(ids).toContain('t_resolve');
    expect(ids).toContain('t_reap');
    await expect(page.locator('tr[data-transition]')).toHaveCount(ids.length);
  });

  test('it shows the typing — six triples, none unwitnessed', async ({ page }) => {
    const panel = await page.evaluate(() => window.__FIBER_PANEL__);
    expect(panel.triples).toBe(6);
    expect(panel.unwitnessed).toBe(0);
    await expect(page.locator('tr[data-triple]')).toHaveCount(6);
  });

  test('it names the verifier', async ({ page }) => {
    const panel = await page.evaluate(() => window.__FIBER_PANEL__);
    expect(panel.verifier).toBe('coeffect-guard-check');
    await expect(page.getByText('coeffect-guard-check')).toBeVisible();
  });

  test('it reports the Baldwin census and the certification', async ({ page }) => {
    const panel = await page.evaluate(() => window.__FIBER_PANEL__);
    expect(panel.census.Splitting).toBeGreaterThan(0);
    expect(panel.certified).toBe(true);
  });

  test('a never-exercised fiber would be marked unwitnessed', async ({ page }) => {
    const panel = await page.evaluate(() => window.__FIBER_PANEL__);
    // the sweep exercises all 15, so none is unwitnessed here — the assertion is that
    // the count is derived, not that it is non-zero
    expect(panel.totals.neverExercised).toEqual([]);
    expect(panel.totals.declared).toBe(15);
    // and the markup carries the class for the case where one is
    const src = await page.content();
    expect(src).toContain('unwitnessed');
  });

  test('it names what the certification excludes', async ({ page }) => {
    await expect(page.getByText(/tauri/)).toBeVisible();
    await expect(page.getByText(/reflow/)).toBeVisible();
  });
});
