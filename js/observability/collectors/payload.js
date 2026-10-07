/**
 * Payload Metric Collector (CDO-13 DV-CDO-13-01)
 *
 * Measures uncompressed data mass, per-kind byte distribution, and checks
 * adherence to declared device archetype budgets from mcard.yaml.
 */
import fs from 'fs';
import path from 'path';

export function collectPayloadMetrics(unitDir, archetype = 'mobile', manifest = null) {
  let totalBytes = 0;
  const perKind = {};

  function scan(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === 'playwright-report' || e.name === 'test-results') {
        continue;
      }
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        scan(full);
      } else if (e.isFile()) {
        const stat = fs.statSync(full);
        totalBytes += stat.size;
        const ext = path.extname(e.name).toLowerCase() || '.bin';
        perKind[ext] = (perKind[ext] || 0) + stat.size;
      }
    }
  }

  scan(unitDir);

  const budgets = manifest?.packaging?.device_archetype_budgets || {
    wearable: { max_bytes: 2097152 },
    mobile: { max_bytes: 10485760 },
    desktop: { max_bytes: 52428800 }
  };

  const archetypeBudget = budgets[archetype]?.max_bytes || budgets.mobile?.max_bytes || 10485760;
  const budgetBreachRatio = totalBytes > archetypeBudget
    ? (totalBytes - archetypeBudget) / archetypeBudget
    : 0.0;

  return {
    total_bytes: totalBytes,
    archetype,
    archetype_budget_bytes: archetypeBudget,
    budget_breach_ratio: Number(budgetBreachRatio.toFixed(4)),
    within_budget: totalBytes <= archetypeBudget,
    per_kind: perKind
  };
}
