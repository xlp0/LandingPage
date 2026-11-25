/**
 * TFZ Zero-Lease Gate & Outbound Disclosure Policy for LandingPage Web-LLM (PKC-06 / DoD-PKC-06-03).
 *
 * Pure browser-safe ES module: ZERO React, ZERO Node built-ins, ZERO ws, ZERO clm-kernel.
 */

export const OUTBOUND_POLICY_SCHEMA_VERSION = 'pkc.outbound-policy.v1';

const FORBIDDEN_KEY_NAMES = new Set([
  'authorization',
  'apikey',
  'api_key',
  'privatekey',
  'private_key',
  'secret',
  'secretkey',
  'secret_key',
  'token',
  'accesstoken',
  'access_token',
  'password',
  'cookie',
  'credentials',
  'attachments',
  'rawattachments',
]);

const FORBIDDEN_MODEL_DIRECTIVES = new Set([
  'sealedvcard',
  'authoritativereceipt',
  'signature',
  'privatekey',
  'acquireclaim',
  'directwrite',
  'bypassvcard',
  'sql',
  'writefile',
]);

function hasSensitiveSegment(fieldPath) {
  return String(fieldPath)
    .split('.')
    .some((seg) => FORBIDDEN_KEY_NAMES.has(seg.trim().toLowerCase()));
}

function readPath(obj, pathStr) {
  let cur = obj;
  for (const seg of String(pathStr).split('.')) {
    if (!cur || typeof cur !== 'object' || Array.isArray(cur) || !(seg in cur)) {
      return { found: false, value: undefined };
    }
    cur = cur[seg];
  }
  return { found: true, value: cur };
}

function assignPath(target, pathStr, value) {
  const segs = String(pathStr).split('.');
  let cur = target;
  for (let i = 0; i < segs.length - 1; i += 1) {
    const seg = segs[i];
    if (!cur[seg] || typeof cur[seg] !== 'object' || Array.isArray(cur[seg])) cur[seg] = {};
    cur = cur[seg];
  }
  cur[segs[segs.length - 1]] = value;
}

function sanitizeValue(val, rules) {
  if (typeof val === 'string') {
    let text = val
      .replace(/\bBearer\s+[A-Za-z0-9._-]+/gi, '[REDACTED]')
      .replace(/\bsk-[A-Za-z0-9_-]{4,}/g, '[REDACTED]');
    for (const rule of rules) {
      if (rule) text = text.split(rule).join('[REDACTED]');
    }
    return text;
  }
  if (Array.isArray(val)) return val.map((item) => sanitizeValue(item, rules));
  if (val && typeof val === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      if (FORBIDDEN_KEY_NAMES.has(k.toLowerCase())) continue;
      out[k] = sanitizeValue(v, rules);
    }
    return out;
  }
  return val;
}

export function validateOutboundPolicy(policy, req) {
  if (!policy || typeof policy !== 'object') return { ok: false, reason: 'missing_outbound_policy' };
  if (policy.schemaVersion !== OUTBOUND_POLICY_SCHEMA_VERSION) {
    return { ok: false, reason: 'unsupported_outbound_policy_version' };
  }
  if (!policy.owner || !policy.policyDigest || !policy.policyId) {
    return { ok: false, reason: 'incomplete_outbound_policy_identity' };
  }
  if (policy.revoked === true) return { ok: false, reason: 'outbound_policy_revoked' };
  const now = req?.nowMs ?? Date.now();
  if (!Number.isFinite(policy.issuedAtMs) || !Number.isFinite(policy.expiresAtMs) || now < policy.issuedAtMs || now > policy.expiresAtMs) {
    return { ok: false, reason: 'outbound_policy_expired_or_inactive' };
  }
  if (policy.providerId !== req?.providerId) return { ok: false, reason: 'provider_identity_mismatch' };
  if (policy.endpoint !== req?.endpoint) return { ok: false, reason: 'provider_endpoint_mismatch' };
  if (policy.allowedPurpose !== req?.purpose) return { ok: false, reason: 'purpose_not_authorized' };
  if (!Number.isFinite(policy.maxPayloadBytes) || policy.maxPayloadBytes <= 0) {
    return { ok: false, reason: 'invalid_max_payload_bytes' };
  }
  if (!Array.isArray(policy.permittedFieldPaths) || policy.permittedFieldPaths.length === 0) {
    return { ok: false, reason: 'empty_permitted_field_paths' };
  }
  for (const p of policy.permittedFieldPaths) {
    if (!p || p.includes('*') || hasSensitiveSegment(p)) {
      return { ok: false, reason: `unsafe_permitted_field_path:${p}` };
    }
  }
  return { ok: true };
}

export function projectDisclosedSnapshot(snapshot, requestedPaths, policy) {
  const allowed = new Set(policy.permittedFieldPaths);
  const disclosed = {};
  const rules = policy.redactionRules ?? [];

  for (const reqPath of requestedPaths ?? []) {
    if (hasSensitiveSegment(reqPath)) return { ok: false, reason: `forbidden_sensitive_field:${reqPath}` };
    if (!allowed.has(reqPath)) return { ok: false, reason: `field_not_permitted:${reqPath}` };
    const found = readPath(snapshot ?? {}, reqPath);
    if (found.found) assignPath(disclosed, reqPath, sanitizeValue(found.value, rules));
  }

  const encoded = new TextEncoder().encode(JSON.stringify(disclosed));
  if (encoded.byteLength > policy.maxPayloadBytes) {
    return { ok: false, reason: `payload_exceeds_byte_limit:${encoded.byteLength}>${policy.maxPayloadBytes}` };
  }
  return { ok: true, disclosed, byteLength: encoded.byteLength };
}

export function redactLogPayload(payload, policy) {
  return sanitizeValue(payload, policy?.redactionRules ?? []);
}

function findForbiddenDirective(obj) {
  for (const [k, v] of Object.entries(obj)) {
    const low = k.toLowerCase();
    if (FORBIDDEN_MODEL_DIRECTIVES.has(low)) return `forbidden_model_directive:${k}`;
    if (low === 'action' && typeof v === 'string' && /claim|write_direct|bypass/i.test(v)) {
      return `prompt_injected_mutation:${v}`;
    }
  }
  return null;
}

export async function proposeWebLlmIntent(req) {
  const leasesBefore = req?.leaseObserver?.activeLeaseCount?.() ?? 0;
  if (leasesBefore !== 0) {
    return {
      ok: false,
      status: 'rejected',
      activeLeasesObserved: leasesBefore,
      reason: 'tfz_requires_zero_active_leases',
      authoritativeReceipt: null,
      sanitizedLog: redactLogPayload({ reason: 'tfz_requires_zero_active_leases' }, req?.policy),
    };
  }
  if (req?.signal?.aborted) {
    return {
      ok: false,
      status: 'cancelled',
      activeLeasesObserved: 0,
      reason: 'aborted_before_dispatch',
      authoritativeReceipt: null,
      sanitizedLog: { status: 'cancelled' },
    };
  }

  const policyCheck = validateOutboundPolicy(req?.policy, {
    providerId: req?.providerId,
    endpoint: req?.endpoint,
    purpose: req?.purpose ?? 'drag-intent-proposal',
    nowMs: req?.nowMs,
  });
  if (!policyCheck.ok) {
    return {
      ok: false,
      status: 'rejected',
      activeLeasesObserved: 0,
      reason: policyCheck.reason,
      authoritativeReceipt: null,
      sanitizedLog: redactLogPayload({ reason: policyCheck.reason }, req?.policy),
    };
  }

  const projection = projectDisclosedSnapshot(req.snapshot, req.requestedFieldPaths, req.policy);
  if (!projection.ok) {
    return {
      ok: false,
      status: 'rejected',
      activeLeasesObserved: 0,
      reason: projection.reason,
      authoritativeReceipt: null,
      sanitizedLog: redactLogPayload({ reason: projection.reason }, req?.policy),
    };
  }

  if (!req?.provider || typeof req.provider.complete !== 'function') {
    return {
      ok: false,
      status: 'failed',
      activeLeasesObserved: 0,
      reason: 'missing_tfz_provider',
      authoritativeReceipt: null,
      sanitizedLog: redactLogPayload({ reason: 'missing_tfz_provider' }, req?.policy),
    };
  }

  let rawResponse;
  const controller = new AbortController();
  const timer = req.timeoutMs ? setTimeout(() => controller.abort(), req.timeoutMs) : null;
  const onParentAbort = () => controller.abort();
  req.signal?.addEventListener('abort', onParentAbort, { once: true });

  try {
    rawResponse = await req.provider.complete(
      {
        providerId: req.providerId,
        endpoint: req.endpoint,
        policyDigest: req.policy.policyDigest,
        disclosedSnapshot: projection.disclosed,
        prompt: req.prompt,
      },
      controller.signal,
    );
  } catch (err) {
    const aborted = controller.signal.aborted || Boolean(req.signal?.aborted);
    const reason = aborted ? 'provider_timeout_or_cancelled' : (err instanceof Error ? err.message : 'provider_error');
    return {
      ok: false,
      status: aborted ? 'cancelled' : 'failed',
      activeLeasesObserved: req.leaseObserver?.activeLeaseCount?.() ?? 0,
      reason,
      authoritativeReceipt: null,
      sanitizedLog: redactLogPayload({ reason, disclosed: projection.disclosed }, req.policy),
    };
  } finally {
    if (timer) clearTimeout(timer);
    req.signal?.removeEventListener('abort', onParentAbort);
  }

  const leasesAfter = req.leaseObserver?.activeLeaseCount?.() ?? 0;
  if (leasesAfter !== 0) {
    return {
      ok: false,
      status: 'rejected',
      activeLeasesObserved: leasesAfter,
      reason: 'lease_acquired_during_tfz_inference',
      authoritativeReceipt: null,
      sanitizedLog: redactLogPayload({ reason: 'lease_acquired_during_tfz_inference' }, req.policy),
    };
  }

  const maxOut = req.maxOutputBytes ?? 16_384;
  if (typeof rawResponse !== 'string' || new TextEncoder().encode(rawResponse).byteLength > maxOut) {
    return {
      ok: false,
      status: 'rejected',
      activeLeasesObserved: 0,
      reason: 'model_output_exceeds_limit',
      authoritativeReceipt: null,
      sanitizedLog: redactLogPayload({ reason: 'model_output_exceeds_limit' }, req.policy),
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(rawResponse);
  } catch {
    return {
      ok: false,
      status: 'rejected',
      activeLeasesObserved: 0,
      reason: 'malformed_model_json',
      authoritativeReceipt: null,
      sanitizedLog: redactLogPayload({ reason: 'malformed_model_json' }, req.policy),
    };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      ok: false,
      status: 'rejected',
      activeLeasesObserved: 0,
      reason: 'model_output_must_be_object',
      authoritativeReceipt: null,
      sanitizedLog: redactLogPayload({ reason: 'model_output_must_be_object' }, req.policy),
    };
  }

  const directiveErr = findForbiddenDirective(parsed);
  if (directiveErr || typeof parsed.targetId !== 'string' || parsed.targetId.length === 0) {
    const reason = directiveErr ?? 'missing_target_id';
    return {
      ok: false,
      status: 'rejected',
      activeLeasesObserved: 0,
      reason,
      authoritativeReceipt: null,
      sanitizedLog: redactLogPayload({ reason }, req.policy),
    };
  }

  const proposal = {
    proposalOnly: true,
    sealedVCard: null,
    snapshotVersion: req.snapshot?.snapshotVersion ?? 0,
    policyDigest: req.policy.policyDigest,
    targetId: parsed.targetId,
    payload: parsed.payload && typeof parsed.payload === 'object' && !Array.isArray(parsed.payload) ? parsed.payload : {},
  };

  if (typeof req.settle === 'function') {
    const settlement = await req.settle(proposal, req.signal);
    return {
      ok: settlement?.status === 'committed',
      proposalOnly: true,
      sealedVCard: null,
      activeLeasesObserved: 0,
      proposal,
      settlement,
      disclosedSnapshot: projection.disclosed,
      sanitizedLog: redactLogPayload({ disclosed: projection.disclosed, status: settlement?.status }, req.policy),
      ...(settlement?.status !== 'committed' ? { status: settlement?.status ?? 'rejected', reason: settlement?.reason ?? 'settlement_rejected', authoritativeReceipt: null } : {}),
    };
  }

  return {
    ok: true,
    proposalOnly: true,
    sealedVCard: null,
    activeLeasesObserved: 0,
    proposal,
    disclosedSnapshot: projection.disclosed,
    sanitizedLog: redactLogPayload({ disclosed: projection.disclosed, targetId: proposal.targetId }, req.policy),
  };
}
