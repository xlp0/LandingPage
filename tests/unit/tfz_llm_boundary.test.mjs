import assert from 'node:assert/strict';
import test from 'node:test';

import { LLMManager } from '../../js/modules/web-llm/llm-manager.js';
import {
  OUTBOUND_POLICY_SCHEMA_VERSION,
  proposeWebLlmIntent,
} from '../../js/modules/web-llm/tfz-gate.js';

const NOW = 1_750_000_000_000;

function makePolicy(overrides = {}) {
  return {
    schemaVersion: OUTBOUND_POLICY_SCHEMA_VERSION,
    policyId: 'lp-pol-1',
    owner: 'owner-lp',
    policyDigest: 'sha256:lp-policy',
    providerId: 'webllm-local',
    endpoint: 'webgpu://local/phi-2',
    allowedPurpose: 'drag-intent-proposal',
    permittedFieldPaths: ['snapshotVersion', 'policyDigest', 'affordanceIds'],
    redactionRules: ['secret-phrase'],
    maxPayloadBytes: 1024,
    issuedAtMs: NOW - 10_000,
    expiresAtMs: NOW + 60_000,
    ...overrides,
  };
}

function makeSnapshot() {
  return {
    snapshotVersion: 5,
    policyDigest: 'sha256:lp-policy',
    affordanceIds: ['slot-compact', 'slot-tablet'],
    apiKey: 'sk-should-not-leak',
    authorization: 'Bearer leak-me',
  };
}

test('TFZ Web-LLM gate allows authorized proposalOnly result with zero active leases', async () => {
  const seen = [];
  const res = await proposeWebLlmIntent({
    provider: {
      complete: async (req) => {
        seen.push(req);
        return JSON.stringify({ targetId: 'slot-tablet', payload: { width: 768 } });
      },
    },
    snapshot: makeSnapshot(),
    policy: makePolicy(),
    requestedFieldPaths: ['snapshotVersion', 'policyDigest', 'affordanceIds'],
    prompt: 'Select tablet slot',
    providerId: 'webllm-local',
    endpoint: 'webgpu://local/phi-2',
    nowMs: NOW,
    leaseObserver: { activeLeaseCount: () => 0 },
  });

  assert.equal(res.ok, true);
  assert.equal(res.proposalOnly, true);
  assert.equal(res.sealedVCard, null);
  assert.equal(res.activeLeasesObserved, 0);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].disclosedSnapshot.apiKey, undefined);
  assert.equal(seen[0].disclosedSnapshot.authorization, undefined);
});

test('TFZ Web-LLM gate rejects missing/expired/revoked policy, disallowed fields, forged receipts, non-zero leases, and aborts', async () => {
  let providerCalls = 0;
  const spyProvider = {
    complete: async () => {
      providerCalls += 1;
      return JSON.stringify({ targetId: 'slot-compact' });
    },
  };

  for (const badPolicy of [
    null,
    makePolicy({ revoked: true }),
    makePolicy({ expiresAtMs: NOW - 1 }),
    makePolicy({ providerId: 'wrong-provider' }),
  ]) {
    const r = await proposeWebLlmIntent({
      provider: spyProvider,
      snapshot: makeSnapshot(),
      policy: badPolicy,
      requestedFieldPaths: ['snapshotVersion'],
      prompt: 'test',
      providerId: 'webllm-local',
      endpoint: 'webgpu://local/phi-2',
      nowMs: NOW,
    });
    assert.equal(r.ok, false);
    assert.equal(r.authoritativeReceipt, null);
  }
  assert.equal(providerCalls, 0);

  const disallowed = await proposeWebLlmIntent({
    provider: spyProvider,
    snapshot: makeSnapshot(),
    policy: makePolicy(),
    requestedFieldPaths: ['apiKey'],
    prompt: 'leak',
    providerId: 'webllm-local',
    endpoint: 'webgpu://local/phi-2',
    nowMs: NOW,
  });
  assert.equal(disallowed.ok, false);
  assert.equal(providerCalls, 0);

  const forged = await proposeWebLlmIntent({
    provider: { complete: async () => JSON.stringify({ targetId: 'slot-compact', authoritativeReceipt: 'fake' }) },
    snapshot: makeSnapshot(),
    policy: makePolicy(),
    requestedFieldPaths: ['snapshotVersion'],
    prompt: 'forge',
    providerId: 'webllm-local',
    endpoint: 'webgpu://local/phi-2',
    nowMs: NOW,
  });
  assert.equal(forged.ok, false);
  assert.equal(forged.authoritativeReceipt, null);

  const leased = await proposeWebLlmIntent({
    provider: spyProvider,
    snapshot: makeSnapshot(),
    policy: makePolicy(),
    requestedFieldPaths: ['snapshotVersion'],
    prompt: 'lease',
    providerId: 'webllm-local',
    endpoint: 'webgpu://local/phi-2',
    nowMs: NOW,
    leaseObserver: { activeLeaseCount: () => 1 },
  });
  assert.equal(leased.ok, false);
  assert.equal(leased.activeLeasesObserved, 1);

  const controller = new AbortController();
  controller.abort();
  const manager = new LLMManager();
  const aborted = await manager.proposeIntent({
    provider: spyProvider,
    snapshot: makeSnapshot(),
    policy: makePolicy(),
    requestedFieldPaths: ['snapshotVersion'],
    prompt: 'abort',
    providerId: 'webllm-local',
    endpoint: 'webgpu://local/phi-2',
    nowMs: NOW,
    signal: controller.signal,
  });
  assert.equal(aborted.ok, false);
  assert.equal(aborted.status, 'cancelled');
});
