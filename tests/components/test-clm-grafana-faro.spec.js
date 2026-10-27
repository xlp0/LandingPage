import { test } from '@playwright/test';
import {
  setupComponent,
  takeScreenshot,
} from '../fixtures/clm-helpers.js';

test.describe('CLM Grafana Faro Component Test', () => {
  test('should load and display grafana faro component', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    await setupComponent(page, 'Grafana Faro', 'grafana-faro');
    await takeScreenshot(page, 'clm-grafana-faro', testInfo);
  });
});
