import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  TEMPLATE_EMITTERS,
  assertSpecMatchesModel,
  assertTemplateTableTotal,
  emitBombadilSpec,
  extractBannerModelHash,
} from '../src/emit-bombadil.ts';
import {
  CLOSED_TEMPLATES,
  computeModelHash,
  loadModelWithNet,
} from '../src/model.ts';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, '../../../..');
const LOCAL_FIXTURES = path.join(TEST_DIR, 'fixtures');
const MONOREPO_SPA_MODEL = path.join(REPO_ROOT, 'schema/bmb/examples/ui-model.spa-target.json');
const MONOREPO_SCHEMA = path.join(REPO_ROOT, 'schema/bmb/ui-model.schema.json');
const SPA_MODEL_PATH = fs.existsSync(MONOREPO_SPA_MODEL)
  ? MONOREPO_SPA_MODEL
  : path.join(LOCAL_FIXTURES, 'ui-model.spa-target.json');
const SCHEMA_PATH = fs.existsSync(MONOREPO_SCHEMA)
  ? MONOREPO_SCHEMA
  : path.join(LOCAL_FIXTURES, 'ui-model.schema.json');
const GOLDEN_PATH = path.join(TEST_DIR, 'golden/spa-target.bombadil.ts');

describe('BMB-03 model-to-Bombadil emitter', () => {
  it('each of the five templates emits exactly one property form and totality rejects an unmapped sixth template', () => {
    const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
    const schemaEnum: string[] = schema.properties.properties.items.properties.template.enum;
    expect(schemaEnum).toEqual([...CLOSED_TEMPLATES]);
    assertTemplateTableTotal(schemaEnum);

    const { model, net } = loadModelWithNet(SPA_MODEL_PATH);
    const emitted = emitBombadilSpec(model, net);
    const tableRows = CLOSED_TEMPLATES.map((tmpl) => ({
      template: tmpl,
      hasEmitter: typeof TEMPLATE_EMITTERS[tmpl] === 'function',
    }));
    expect(tableRows.every((r) => r.hasEmitter)).toBe(true);
    expect(emitted).toContain('export const init_overview = always(() => inInitialPlace(');
    expect(emitted).toContain('export const place_is_declared = always(() => inPlace(');
    expect(emitted).toContain('export const moves_follow_net = always(now(() =>');
    expect(emitted).toContain('export const recover_returns_overview = always(now(() =>');
    expect(emitted).toContain('export const open_details_eventually = eventually(() => fired(');

    expect(() => assertTemplateTableTotal([...schemaEnum, 'until_custom'])).toThrow(
      /missing_template_emitter.*"until_custom"/,
    );
  });

  it('golden: emitted SPA target spec matches golden file byte for byte and agrees with Python kernel model hash', () => {
    const { model, net, modelHash, netHash } = loadModelWithNet(SPA_MODEL_PATH);
    expect(modelHash).toBe('blake3:9a83a0373bfc7ba6928d43a604c90bfaf30eb0e1879411208f3885f391b6a167');
    const emitted = emitBombadilSpec(model, net, { modelHash, netHash });
    const golden = fs.readFileSync(GOLDEN_PATH, 'utf8');
    expect(emitted).toBe(golden);
  });

  it('hash: refuses a model whose hash differs from the emitted banner with model_hash_mismatch', () => {
    const { model, net, modelHash, netHash } = loadModelWithNet(SPA_MODEL_PATH);
    const emitted = emitBombadilSpec(model, net, { modelHash, netHash });
    expect(extractBannerModelHash(emitted)).toBe(modelHash);
    expect(() => assertSpecMatchesModel(emitted, model, netHash)).not.toThrow();

    const mutated = structuredClone(model);
    mutated.engine.time_budget_s = 999;
    expect(computeModelHash(mutated, netHash)).not.toBe(modelHash);
    expect(() => assertSpecMatchesModel(emitted, mutated, netHash)).toThrow(/model_hash_mismatch/);
  });

  it('weight: a zero-weight action is absent from generators and present in coverage denominator', () => {
    const { model, net } = loadModelWithNet(SPA_MODEL_PATH);
    const weightedModel = structuredClone(model);
    weightedModel.actions.t_spa_invalid_unmapped = {
      generator_key: 'gen.spa.invalid_unmapped',
      weight: 0,
    };
    const emitted = emitBombadilSpec(weightedModel, net);
    expect(emitted).not.toContain('act_t_spa_invalid_unmapped');
    expect(emitted).not.toContain('TriggerInvalidUnmapped');
    expect(emitted).toContain('coverageDenominator: 4');
    expect(emitted).toContain('"t_spa_invalid_unmapped"');
  });
});
