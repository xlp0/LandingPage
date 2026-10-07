import { test, expect } from '@playwright/test';

test.describe('CDO-14: Correctness & Hoare Triple Observability in Deployment Unit Inspector', () => {

  test('DV-CDO-14-01..11: Full Correctness Panel rendering, Galois pairs, Hoare table, Alignment, Coherence, REPL SVG, Brittleness, and Island rows', async ({ page }) => {
    // Navigate to Landing Page
    await page.goto('/');

    // Step 1: Open Deployment Unit Inspector
    console.log('[Test] Step 1: Opening Deployment Unit Inspector');
    const inspectorBtn = page.locator('#deployment-inspector-btn');
    await expect(inspectorBtn).toBeVisible();
    await inspectorBtn.click();

    const inspectorModal = page.locator('#deployment-inspector-modal');
    await expect(inspectorModal).toBeVisible();

    // Step 2: Verify Coexistence of Metrics Slot and Correctness Slot (DV-CDO-14-11)
    console.log('[Test] Step 2: Verifying Coexistence of #insp-slot-metrics and #insp-slot-correctness');
    const metricsSlot = page.locator('#insp-slot-metrics');
    const correctnessSlot = page.locator('#insp-slot-correctness');
    await expect(metricsSlot).toBeVisible();
    await expect(correctnessSlot).toBeVisible();

    // Verify metrics charts still present (neither replaces the other)
    await expect(page.locator('#insp-treemap-container svg')).toBeVisible();

    // Step 3: Verify Correctness Panel mounted into #insp-slot-correctness
    console.log('[Test] Step 3: Verifying Correctness Panel mounted');
    const panel = page.locator('#correctness-observability-panel');
    await expect(panel).toBeVisible();

    // Step 4: Verify Header & Galois Pairs labelled by layer (DV-CDO-14-01, DV-CDO-14-06)
    console.log('[Test] Step 4: Verifying Galois pairs labelled by layer (Map/Territory separation)');
    const verdictPill = page.locator('#correctness-verdict-pill');
    await expect(verdictPill).toBeVisible();
    // Safety-only: unit must NEVER be labelled "correct" (INV-CDO-06)
    await expect(verdictPill).toContainText('Safety-only');
    await expect(verdictPill).not.toContainText('Whole-unit Correct');

    // A-layer (Map): Soundness ⊣ Completeness
    const aLayerCard = page.locator('.a-layer-card');
    await expect(aLayerCard).toBeVisible();
    await expect(aLayerCard).toContainText('A-layer');
    await expect(aLayerCard).toContainText('Map');
    await expect(aLayerCard).toContainText('Soundness');
    await expect(aLayerCard).toContainText('Completeness');

    // C-layer (Territory): Safety ⊣ Liveness
    const cLayerCard = page.locator('.c-layer-card');
    await expect(cLayerCard).toBeVisible();
    await expect(cLayerCard).toContainText('C-layer');
    await expect(cLayerCard).toContainText('Territory');
    await expect(cLayerCard).toContainText('Safety');
    await expect(cLayerCard).toContainText('Liveness');
    await expect(cLayerCard).toContainText('Safety-only');

    // Step 5: Verify Directional Alignment and Jacobian (DV-CDO-14-05)
    console.log('[Test] Step 5: Verifying Directional Alignment & Jacobian determinant');
    const alignScoreVal = page.locator('#align-score-val');
    await expect(alignScoreVal).toBeVisible();
    const alignBadge = page.locator('#align-status-badge');
    await expect(alignBadge).toContainText('Aligned (≥ 0.85 threshold)');

    const jacobianDisplay = page.locator('#jacobian-status-display');
    await expect(jacobianDisplay).toContainText('det(J) = 1 ≠ 0 (Invertible)');

    // Step 6: Verify Coherence Gluing Status (4 quadrants, DV-CDO-14-07)
    console.log('[Test] Step 6: Verifying Coherence Gluing 4 quadrants (Sheaf condition H¹ = 0)');
    await expect(page.locator('#quadrant-consistent-and-correct')).toBeVisible();
    await expect(page.locator('#quadrant-consistent-only')).toBeVisible();
    await expect(page.locator('#quadrant-correct-only')).toBeVisible();
    await expect(page.locator('#quadrant-neither')).toBeVisible();
    await expect(page.locator('#quadrant-consistent-only')).toHaveClass(/quadrant-active/);

    const doctrineNote = page.locator('.coherence-doctrine-note');
    await expect(doctrineNote).toContainText('H¹ = 0');
    await expect(doctrineNote).toContainText('trustworthy per the Correctness doctrine');

    // Step 7: Verify REPL Process Model live SVG diagram (DV-CDO-14-08)
    console.log('[Test] Step 7: Verifying REPL Process Model SVG cycle');
    const replSvg = page.locator('#repl-svg-container svg');
    await expect(replSvg).toBeVisible();
    await expect(replSvg).toContainText('1. Read (prep)');
    await expect(replSvg).toContainText('2. Evaluate (exec)');
    await expect(replSvg).toContainText('3. Print (post)');
    await expect(replSvg).toContainText('4. Loop (await)');
    await expect(replSvg).toContainText('Safety');
    await expect(replSvg).toContainText('Soundness');
    await expect(replSvg).toContainText('Completeness');
    await expect(replSvg).toContainText('Liveness');

    // Step 8: Verify Per-Transition Hoare Triple Table (DV-CDO-14-02, DV-CDO-14-03)
    console.log('[Test] Step 8: Verifying Per-Transition Hoare Table & resource bounds');
    const hoareTable = page.locator('#hoare-triples-table');
    await expect(hoareTable).toBeVisible();

    const hoareRows = page.locator('#hoare-triples-table tbody tr');
    await expect(hoareRows).toHaveCount(6);

    // Verify transitions match net
    await expect(page.locator('#hoare-row-ht_dispatch_covers_by_subsumption')).toContainText('t_resolve');
    await expect(page.locator('#hoare-row-ht_dispatch_covers_by_subsumption')).toContainText(/total/i);
    await expect(page.locator('#hoare-row-ht_load_requires_satisfiable_coeffects')).toContainText('t_load');
    await expect(page.locator('#hoare-row-ht_load_requires_satisfiable_coeffects')).toContainText(/partial/i);
    await expect(page.locator('#hoare-row-ht_activate_registers_the_inverse')).toContainText('t_activate');
    await expect(page.locator('#hoare-row-ht_dispose_reaches_the_sink')).toContainText('t_dispose');
    await expect(page.locator('#hoare-row-ht_bottom_halts_with_zero_side_effects')).toContainText('t_load');
    await expect(page.locator('#hoare-row-ht_reap_accounts_for_a_failed_token')).toContainText('t_reap');

    // Verify VCard sandwich note
    await expect(page.locator('.hoare-table-section')).toContainText('VCard Sandwich');

    // Step 9: Verify Certificate Chain & Simple Verifier (DV-CDO-14-04)
    console.log('[Test] Step 9: Verifying Certificate Chain and Simple Verifier complexity (INV-CDO-27)');
    const verifierCard = page.locator('#verifier-card');
    await expect(verifierCard).toBeVisible();
    await expect(verifierCard).toContainText('coeffect-guard-check');
    await expect(verifierCard).toContainText('Complexity: O(1)');
    await expect(page.locator('#verifier-status-badge')).toContainText('verified');

    // Step 10: Verify Island-Level Correctness Rows (DV-CDO-14-10)
    console.log('[Test] Step 10: Verifying Island-Level Correctness Rows (INV-CDO-28..30)');
    const islandsTable = page.locator('#islands-correctness-table');
    await expect(islandsTable).toBeVisible();
    const islandRows = page.locator('#islands-correctness-table tbody tr');
    await expect(islandRows).toHaveCount(5);

    await expect(page.locator('#island-row-landing-hero')).toContainText('landing-hero');
    await expect(page.locator('#island-row-deployment-inspector')).toContainText('deployment-inspector');
    await expect(page.locator('#island-row-navigation-bar')).toContainText('navigation-bar');
    await expect(page.locator('#island-row-music-visualizer')).toContainText('music-visualizer');
    await expect(page.locator('#island-row-responsive-lab')).toContainText('responsive-lab');

    const islandBadges = page.locator('.island-binding-badge');
    const badgeCount = await islandBadges.count();
    for (let i = 0; i < badgeCount; i++) {
      await expect(islandBadges.nth(i)).toContainText('verified');
    }
    await expect(page.locator('#island-unit-green-badge')).toContainText('All Islands Passing');

    // Step 11: Verify Brittleness Disclosure (DV-CDO-14-09)
    console.log('[Test] Step 11: Verifying Brittleness Disclosure & Sussman risks');
    const stalenessBadge = page.locator('#staleness-status-badge');
    await expect(stalenessBadge).toBeVisible();
    await expect(stalenessBadge).toContainText('Fresh');

    const brittlenessSection = page.locator('.brittleness-section');
    await expect(brittlenessSection).toContainText('Frame Problem');
    await expect(brittlenessSection).toContainText('Sussman Anomaly');
    await expect(brittlenessSection).toContainText('Temporal Brittleness');
    await expect(brittlenessSection).toContainText('A one-time pass is not a permanent property');

    // Step 12: Switch inspector target to Desktop and verify updates
    console.log('[Test] Step 12: Switching target archetype to Desktop');
    await page.locator('#tab-desktop').click();
    await expect(page.locator('#correctness-observability-panel')).toBeVisible();

    // Step 13: Close inspector modal and verify clean drain
    console.log('[Test] Step 13: Closing Deployment Unit Inspector and verifying clean drain');
    await page.locator('#inspector-close-btn').click();
    await expect(inspectorModal).not.toBeVisible();
  });

});
