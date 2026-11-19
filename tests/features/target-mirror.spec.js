/**
 * BPV-06 DoD-BPV-06-01, decision BPV-D08: the lab mirrors the framed target's
 * place onto the ViewportStage root, so users see the target state and Bombadil
 * can check it from the top document.
 */
import { test, expect, SPA_FIXTURE_PATH, loadSpaFixtureGraph } from '../fixtures/app-fixtures.js';

const spaGraph = loadSpaFixtureGraph();
const STAGE_ROOT = '#viewport-scale-wrapper';

// One walk that fires every transition of the SPA net once, in an order the net allows.
const WALK = [
  { transitionId: 't_spa_open_details', to: 'p_spa_details' },
  { transitionId: 't_spa_back_overview', to: 'p_spa_overview' },
  { transitionId: 't_spa_invalid_unmapped', to: 'p_spa_missing_transition' },
  { transitionId: 't_spa_recover_overview', to: 'p_spa_overview' }
];

async function expectMirror(page, appRoot, placeId) {
  await expect(appRoot).toHaveAttribute('data-place-id', placeId);
  const nonce = await appRoot.getAttribute('data-boot-nonce');
  const stage = page.locator(STAGE_ROOT);
  await expect(stage).toHaveAttribute('data-target-place-id', placeId);
  await expect(stage).toHaveAttribute('data-target-boot-nonce', nonce);
  const pill = page.getByTestId('stage-target-place');
  await expect(pill).toBeVisible();
  await expect(pill).toContainText(placeId);
}

test.describe('BPV-06: the stage mirrors the framed target place', () => {
  test('the walk covers every transition of the SPA net', () => {
    const declared = spaGraph.topology.transitions.map((t) => t.id).sort();
    expect(WALK.map((step) => step.transitionId).sort()).toEqual(declared);
  });

  test('the host mirror tracks the SPA fixture through every transition', async ({ isolatedLabPage, workbench }) => {
    const { page } = isolatedLabPage;
    await workbench.open({ targetPath: SPA_FIXTURE_PATH });
    const appRoot = workbench.targetFrame().locator('#spa-app-root');

    await expectMirror(page, appRoot, 'p_spa_overview');

    for (const step of WALK) {
      await workbench.targetFrame().locator(`button[data-transition-id="${step.transitionId}"]`).click();
      await expectMirror(page, appRoot, step.to);
    }
  });

  test('the mirror follows a reload of the framed document', async ({ isolatedLabPage, workbench }) => {
    const { page } = isolatedLabPage;
    await workbench.open({ targetPath: SPA_FIXTURE_PATH });
    const appRoot = workbench.targetFrame().locator('#spa-app-root');
    await expectMirror(page, appRoot, 'p_spa_overview');
    const firstNonce = await appRoot.getAttribute('data-boot-nonce');

    await page.getByTestId('btn-load-in-iframe').click();
    await expect(appRoot).not.toHaveAttribute('data-boot-nonce', firstNonce);
    await expectMirror(page, appRoot, 'p_spa_overview');
  });

  test('the mirror clears when the target has no observable place', async ({ isolatedLabPage, workbench }) => {
    const { page } = isolatedLabPage;
    await workbench.open({ targetPath: SPA_FIXTURE_PATH });
    await expectMirror(page, workbench.targetFrame().locator('#spa-app-root'), 'p_spa_overview');

    await workbench.selectPresetTarget('index.html');
    const stage = page.locator(STAGE_ROOT);
    await expect(stage).not.toHaveAttribute('data-target-place-id', /.+/);
    await expect(page.getByTestId('stage-target-place')).toBeHidden();
  });
});
