/**
 * Conformance Suite Runner (SPRINT-ERB-06 §2, §4, §6.1)
 * Evaluates declarative conformance specs against Playwright pages with central fidelity gating.
 */

import { CHECK_CATALOG } from './catalog.js';
import { canonicalJson } from '../../js/harness/test-run-schema.js';
import { hashContent } from '../../server/mcard-api.mjs';

/**
 * Runs a conformance spec against a page in an emulated device context.
 * @param {import('@playwright/test').Page} page
 * @param {Object} spec Conformance spec definition
 * @param {Object} contextInfo
 * @param {Object} contextInfo.profile DeviceProfileV2
 * @param {'portrait'|'landscape'} contextInfo.orientation
 * @param {Object} contextInfo.fidelity FidelityDeclaration (tier, emulated, notEmulated)
 * @param {string[]} [contextInfo.consoleErrors=[]]
 * @returns {Promise<Object>} DeviceConformanceReportV1
 */
export async function runConformance(page, spec, contextInfo) {
  const { profile, orientation, fidelity, consoleErrors = [] } = contextInfo;

  const results = [];
  let passCount = 0;
  let failCount = 0;
  let skippedCount = 0;
  let notAppCount = 0;

  for (const checkDecl of spec.checks || []) {
    const check = CHECK_CATALOG[checkDecl.id];
    if (!check) {
      results.push({
        id: checkDecl.id,
        status: 'fail',
        evidence: { error: `Unknown check ID: '${checkDecl.id}'` }
      });
      failCount++;
      continue;
    }

    // 1. Check capability applicability
    if (!check.appliesTo(profile, checkDecl)) {
      results.push({ id: check.id, status: 'not-applicable' });
      notAppCount++;
      continue;
    }

    // 2. Central Fidelity Gating (INV-DSF-01)
    const emulatedSet = new Set(fidelity.emulated || []);
    const notEmulatedSet = new Set(fidelity.notEmulated || []);
    const missing = (check.requires || []).filter(
      (req) => notEmulatedSet.has(req) || !emulatedSet.has(req)
    );

    if (missing.length > 0) {
      results.push({
        id: check.id,
        status: 'skipped',
        reason: 'fidelity',
        missing
      });
      skippedCount++;
      continue;
    }

    // 3. Execute check
    try {
      const params = {
        ...(checkDecl.params || {}),
        activeCategory: profile.category,
        errors: consoleErrors
      };

      const outcome = await check.run(page, params);
      results.push({
        id: check.id,
        status: outcome.status,
        evidence: outcome.evidence || {}
      });

      if (outcome.status === 'pass') passCount++;
      else if (outcome.status === 'fail') failCount++;
      else if (outcome.status === 'skipped') skippedCount++;
      else notAppCount++;
    } catch (err) {
      results.push({
        id: check.id,
        status: 'fail',
        evidence: { error: err.message || String(err) }
      });
      failCount++;
    }
  }

  const specHash = `blake3:${hashContent(canonicalJson(spec), 'blake3')}`;
  const targetUrl = spec.target || page.url();
  const slug = spec.targetSlug || (typeof spec.target === 'string' ? spec.target.replace(/[^a-z0-9_]+/gi, '-') : 'target');

  return {
    schema: 'urn:mcard:schema:device_conformance_report:v1',
    specHash,
    target: { url: targetUrl, slug },
    device: { id: profile.id, orientation },
    fidelity: {
      tier: fidelity.tier,
      runner: fidelity.runner,
      emulated: fidelity.emulated,
      notEmulated: fidelity.notEmulated
    },
    summary: {
      pass: passCount,
      fail: failCount,
      skipped: skippedCount,
      notApplicable: notAppCount
    },
    results
  };
}
