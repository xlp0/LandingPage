import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

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
    await expect(status).toHaveAttribute('data-ready', 'true', { timeout: 10000 });

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
});
