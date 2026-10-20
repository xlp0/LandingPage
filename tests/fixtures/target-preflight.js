/**
 * Target Preflight Utility (SPRINT-ERB-04 §2)
 * Ensures external and local target URLs are reachable before running Playwright specs.
 */

import { test } from '@playwright/test';

/**
 * Checks if target URL is reachable. If not, skips test with explanation.
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} url
 * @param {number} [timeoutMs=2000]
 * @returns {Promise<boolean>}
 */
export async function ensureTargetReachable(request, url, timeoutMs = 2000) {
  if (!url || typeof url !== 'string') {
    test.skip(true, 'Target URL is undefined or empty');
    return false;
  }

  // Relative URLs hosted by the dev server are always considered reachable if server is running
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return true;
  }

  try {
    const res = await request.get(url, {
      timeout: timeoutMs,
      ignoreHTTPSErrors: true,
      failOnStatusCode: false
    });
    if (!res.ok() && res.status() >= 500) {
      test.skip(true, `Target URL '${url}' responded with server error HTTP ${res.status()}`);
      return false;
    }
    return true;
  } catch (err) {
    test.skip(true, `Target URL '${url}' is not reachable: ${err.message || err}`);
    return false;
  }
}
