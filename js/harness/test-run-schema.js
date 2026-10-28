/**
 * Test Run Schema Validation & Canonical Serialization (SPRINT-ERB-03 §4.1)
 * Schema: urn:mcard:schema:responsive_test_run:v1
 * Zero dependencies, isomorphic across Node.js and Browser.
 */

import { validateDevice } from '../device-registry.js';

export const TEST_RUN_SCHEMA = 'urn:mcard:schema:responsive_test_run:v1';
export const REPLAY_RESULT_SCHEMA = 'urn:mcard:schema:replay_result:v1';
export const CONFORMANCE_REPORT_SCHEMA = 'urn:mcard:schema:device_conformance_report:v1';
export const CERTIFICATION_SCHEMA = 'urn:mcard:certification:responsive:v1';
export const NAVIGATION_RUN_LINK_SCHEMA = 'urn:gqc:navigation-run-link:v1';
export const INTERRUPTED_CAPTURE_SCHEMA = 'urn:gqc:interrupted-capture:v1';
export const RECOGNIZED_RUN_SCHEMAS = Object.freeze([
  TEST_RUN_SCHEMA,
  REPLAY_RESULT_SCHEMA,
  CONFORMANCE_REPORT_SCHEMA,
  CERTIFICATION_SCHEMA,
  NAVIGATION_RUN_LINK_SCHEMA,
  INTERRUPTED_CAPTURE_SCHEMA
]);
export const MAX_EVENTS = 2048;

const ALLOWED_TOP_LEVEL_KEYS = new Set([
  'schema',
  'sessionId',
  'target',
  'captureSource',
  'device',
  'orientation',
  'fidelity',
  'lab',
  'metrics',
  'telemetry',
  'finalState',
  'events'
]);

/**
 * Derives a clean URL slug for handle and g_time namespacing.
 * @param {string} urlStr
 * @returns {string}
 */
export function targetSlug(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return '';
  try {
    const u = new URL(urlStr);
    const hostPart = u.port ? `${u.hostname}-${u.port}` : u.hostname;
    const raw = `${hostPart}${u.pathname}`;
    return raw
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '-')
      .replace(/^-+|-+$/g, '');
  } catch {
    return '';
  }
}

/**
 * Deterministic JSON serialization with recursively sorted object keys.
 * Rejects non-finite numbers and drops undefined.
 * @param {any} value
 * @returns {string}
 */
export function canonicalJson(value) {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new TypeError('Cannot canonically serialize non-finite numbers (NaN, Infinity)');
    }
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const items = value.map((v) => canonicalJson(v === undefined ? null : v));
    return `[${items.join(',')}]`;
  }

  const keys = Object.keys(value).sort();
  const pairs = [];
  for (const k of keys) {
    const v = value[k];
    if (v !== undefined) {
      pairs.push(`${JSON.stringify(k)}:${canonicalJson(v)}`);
    }
  }
  return `{${pairs.join(',')}}`;
}

/**
 * Validates a replay result payload against urn:mcard:schema:replay_result:v1.
 */
export function validateReplayResult(res) {
  const errors = [];
  if (!res || typeof res !== 'object' || Array.isArray(res)) {
    return { valid: false, errors: ['Replay result must be a non-null object'] };
  }
  if (res.schema !== REPLAY_RESULT_SCHEMA) {
    errors.push(`Invalid schema: expected '${REPLAY_RESULT_SCHEMA}', got '${res.schema}'`);
  }
  if (typeof res.sourceRunHash !== 'string' || !res.sourceRunHash.trim()) {
    errors.push('sourceRunHash must be a non-empty string');
  }
  if (!['pass', 'fail', 'fragile', 'partial'].includes(res.verdict)) {
    errors.push(`Invalid verdict: expected 'pass' | 'fail' | 'fragile' | 'partial', got '${res.verdict}'`);
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Validates a device conformance report payload against urn:mcard:schema:device_conformance_report:v1.
 */
export function validateConformanceReport(rep) {
  const errors = [];
  if (!rep || typeof rep !== 'object' || Array.isArray(rep)) {
    return { valid: false, errors: ['Conformance report must be a non-null object'] };
  }
  if (rep.schema !== CONFORMANCE_REPORT_SCHEMA) {
    errors.push(`Invalid schema: expected '${CONFORMANCE_REPORT_SCHEMA}', got '${rep.schema}'`);
  }
  if (!rep.target || typeof rep.target !== 'object') {
    errors.push('target must be an object with url and slug');
  }
  if (!rep.device || typeof rep.device !== 'object') {
    errors.push('device must be an object with id and orientation');
  }
  if (!rep.fidelity || typeof rep.fidelity !== 'object') {
    errors.push('fidelity must be an object');
  }
  if (!rep.summary || typeof rep.summary !== 'object') {
    errors.push('summary must be an object');
  }
  if (!Array.isArray(rep.results)) {
    errors.push('results must be an array');
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Validates a responsive certification payload against urn:mcard:certification:responsive:v1.
 */
export function validateCertification(cert) {
  const errors = [];
  if (!cert || typeof cert !== 'object' || Array.isArray(cert)) {
    return { valid: false, errors: ['Certification must be a non-null object'] };
  }
  if (cert.schema !== CERTIFICATION_SCHEMA) {
    errors.push(`Invalid schema: expected '${CERTIFICATION_SCHEMA}', got '${cert.schema}'`);
  }
  if (!cert.target || typeof cert.target !== 'object') {
    errors.push('target must be an object');
  }
  if (typeof cert.certified !== 'boolean') {
    errors.push('certified must be a boolean');
  }
  if (!Array.isArray(cert.reports)) {
    errors.push('reports must be an array of hashes');
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Validates a test run payload against urn:mcard:schema:responsive_test_run:v1 or recognized schemas.
 * @param {any} run
 * @returns {{ valid: boolean, errors: string[] }}
 */

const HEX64_PATTERN = /^[a-f0-9]{64}$/;

export function validateNavigationRunLink(link) {
  const errors = [];
  if (!link || typeof link !== 'object' || Array.isArray(link)) {
    return { valid: false, errors: ['Navigation run link must be a non-null object'] };
  }
  if (link.schema !== NAVIGATION_RUN_LINK_SCHEMA) {
    errors.push(`Invalid schema: expected '${NAVIGATION_RUN_LINK_SCHEMA}', got '${link.schema}'`);
  }
  if (typeof link.runHash !== 'string' || !HEX64_PATTERN.test(link.runHash)) {
    errors.push('runHash must be a 64-character lowercase hex digest');
  }
  if (typeof link.sessionId !== 'string' || !link.sessionId.trim()) {
    errors.push('sessionId must be a non-empty string');
  }
  if (typeof link.targetNetId !== 'string' || !link.targetNetId.trim()) {
    errors.push('targetNetId must be a non-empty string');
  }
  if (typeof link.targetNetMCardHash !== 'string' || !HEX64_PATTERN.test(link.targetNetMCardHash)) {
    errors.push('targetNetMCardHash must be a 64-character lowercase hex digest');
  }
  if (typeof link.bindingsMCardHash !== 'string' || !HEX64_PATTERN.test(link.bindingsMCardHash)) {
    errors.push('bindingsMCardHash must be a 64-character lowercase hex digest');
  }
  if (typeof link.initialMarkingHash !== 'string' || !HEX64_PATTERN.test(link.initialMarkingHash)) {
    errors.push('initialMarkingHash must be a 64-character lowercase hex digest');
  }
  if (!Array.isArray(link.receiptHashes) || link.receiptHashes.some((h) => typeof h !== 'string' || !HEX64_PATTERN.test(h))) {
    errors.push('receiptHashes must be an array of 64-character lowercase hex digests');
  }
  if (typeof link.finalPlaceId !== 'string' || !link.finalPlaceId.trim()) {
    errors.push('finalPlaceId must be a non-empty string');
  }
  if (link.sessionStatus !== 'ACTIVE' && link.sessionStatus !== 'ERROR_MODAL') {
    errors.push(`sessionStatus must be 'ACTIVE' or 'ERROR_MODAL', got '${link.sessionStatus}'`);
  }
  return { valid: errors.length === 0, errors };
}

export function validateInterruptedCapture(cap) {
  const errors = [];
  if (!cap || typeof cap !== 'object' || Array.isArray(cap)) {
    return { valid: false, errors: ['Interrupted capture must be a non-null object'] };
  }
  if (cap.schema !== INTERRUPTED_CAPTURE_SCHEMA) {
    errors.push(`Invalid schema: expected '${INTERRUPTED_CAPTURE_SCHEMA}', got '${cap.schema}'`);
  }
  if (typeof cap.sessionId !== 'string' || !cap.sessionId.trim()) {
    errors.push('sessionId must be a non-empty string');
  }
  if (!cap.target || typeof cap.target !== 'object' || typeof cap.target.url !== 'string' || !cap.target.url.trim()) {
    errors.push('target must be an object with non-empty url');
  }
  if (typeof cap.lifecycleState !== 'string' || !cap.lifecycleState.trim() || cap.lifecycleState === 'FINALIZED') {
    errors.push('lifecycleState must be a non-empty non-FINALIZED state');
  }
  if (typeof cap.reason !== 'string' || !cap.reason.trim()) {
    errors.push('reason must be a non-empty string');
  }
  if (cap.incomplete !== true) {
    errors.push('incomplete must be true');
  }
  if (cap.passing !== false) {
    errors.push('passing must be false');
  }
  if (cap.certified !== false) {
    errors.push('certified must be false');
  }
  return { valid: errors.length === 0, errors };
}

export function parseStoredTestRunRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return { ok: false, unsupportedVersion: false, errors: ['Stored record must be a JSON object'] };
  }
  if (typeof record.schema === 'string' && !RECOGNIZED_RUN_SCHEMAS.includes(record.schema)) {
    return {
      ok: false,
      unsupportedVersion: true,
      downgradedToV1: false,
      schema: record.schema,
      errors: [`Unsupported test run schema version '${record.schema}'`]
    };
  }
  if (record.schema === INTERRUPTED_CAPTURE_SCHEMA) {
    const check = validateInterruptedCapture(record);
    return {
      ok: check.valid,
      unsupportedVersion: false,
      incomplete: true,
      passing: false,
      certified: false,
      verdict: 'incomplete',
      schema: record.schema,
      record,
      errors: check.errors
    };
  }
  const check = validateTestRun(record);
  return {
    ok: check.valid,
    unsupportedVersion: Boolean(check.unsupportedVersion),
    incomplete: false,
    passing: check.valid && record.schema === TEST_RUN_SCHEMA,
    verdict: check.valid ? 'finalized' : 'invalid',
    schema: record.schema || null,
    record,
    errors: check.errors
  };
}

export function validateTestRun(run) {
  if (run?.schema === REPLAY_RESULT_SCHEMA) {
    return validateReplayResult(run);
  }
  if (run?.schema === CONFORMANCE_REPORT_SCHEMA) {
    return validateConformanceReport(run);
  }
  if (run?.schema === CERTIFICATION_SCHEMA) {
    return validateCertification(run);
  }
  if (run?.schema === NAVIGATION_RUN_LINK_SCHEMA) {
    return validateNavigationRunLink(run);
  }
  if (run?.schema === INTERRUPTED_CAPTURE_SCHEMA) {
    return validateInterruptedCapture(run);
  }
  if (
    run &&
    typeof run === 'object' &&
    !Array.isArray(run) &&
    typeof run.schema === 'string' &&
    !RECOGNIZED_RUN_SCHEMAS.includes(run.schema)
  ) {
    return {
      valid: false,
      unsupportedVersion: true,
      errors: [`Unsupported schema version '${run.schema}'; silent downgrade to '${TEST_RUN_SCHEMA}' is prohibited`]
    };
  }

  const errors = [];

  if (!run || typeof run !== 'object' || Array.isArray(run)) {
    return { valid: false, errors: ['Test run must be a non-null object'] };
  }

  if (run.incomplete === true || (run.lifecycleState !== undefined && run.lifecycleState !== 'FINALIZED')) {
    errors.push('Unfinalized or interrupted capture cannot be stored as responsive_test_run:v1');
  }

  // Reject unknown top-level keys (closed schema)
  for (const key of Object.keys(run)) {
    if (!ALLOWED_TOP_LEVEL_KEYS.has(key)) {
      errors.push(`Unknown top-level property: '${key}'`);
    }
  }

  // schema
  if (run.schema !== TEST_RUN_SCHEMA) {
    errors.push(`Invalid schema: expected '${TEST_RUN_SCHEMA}', got '${run.schema}'`);
  }

  // sessionId
  if (typeof run.sessionId !== 'string' || !run.sessionId.trim()) {
    errors.push('sessionId must be a non-empty string');
  }

  // target
  if (!run.target || typeof run.target !== 'object') {
    errors.push('target must be an object with url and slug');
  } else {
    if (typeof run.target.url !== 'string' || !run.target.url.trim()) {
      errors.push('target.url must be a non-empty string');
    }
    if (typeof run.target.slug !== 'string' || !run.target.slug.trim()) {
      errors.push('target.slug must be a non-empty string');
    }
  }

  // captureSource
  if (run.captureSource !== 'same-origin' && run.captureSource !== 'probe-agent') {
    errors.push(`captureSource must be 'same-origin' or 'probe-agent', got '${run.captureSource}'`);
  }

  // device
  if (!run.device || typeof run.device !== 'object') {
    errors.push('device must be an object');
  } else {
    const devValid = validateDevice(run.device);
    if (!devValid.valid) {
      errors.push(...devValid.errors.map((e) => `device.${e}`));
    }
  }

  // orientation
  if (run.orientation !== 'portrait' && run.orientation !== 'landscape') {
    errors.push(`orientation must be 'portrait' or 'landscape', got '${run.orientation}'`);
  }

  // fidelity
  if (!run.fidelity || typeof run.fidelity !== 'object') {
    errors.push('fidelity must be an object');
  } else {
    if (![0, 1, 2, 3].includes(run.fidelity.tier)) {
      errors.push(`fidelity.tier must be 0, 1, 2, or 3, got '${run.fidelity.tier}'`);
    }
    if (typeof run.fidelity.runner !== 'string') {
      errors.push('fidelity.runner must be a string');
    }
    if (!Array.isArray(run.fidelity.emulated)) {
      errors.push('fidelity.emulated must be an array');
    }
    if (!Array.isArray(run.fidelity.notEmulated)) {
      errors.push('fidelity.notEmulated must be an array');
    }
  }

  // lab
  if (!run.lab || typeof run.lab !== 'object') {
    errors.push('lab must be an object with commit and clmKernel');
  }

  // metrics
  if (!run.metrics || typeof run.metrics !== 'object') {
    errors.push('metrics must be an object');
  } else {
    if (typeof run.metrics.startedAt !== 'string' || isNaN(Date.parse(run.metrics.startedAt))) {
      errors.push('metrics.startedAt must be a valid ISO date string');
    }
    if (typeof run.metrics.activeDurationMs !== 'number' || run.metrics.activeDurationMs < 0) {
      errors.push('metrics.activeDurationMs must be a non-negative number');
    }
    if (typeof run.metrics.eventCount !== 'number' || run.metrics.eventCount < 0) {
      errors.push('metrics.eventCount must be a non-negative number');
    }
    if (typeof run.metrics.droppedCount !== 'number' || run.metrics.droppedCount < 0) {
      errors.push('metrics.droppedCount must be a non-negative number');
    }
    if (typeof run.metrics.rejectedMessages !== 'number' || run.metrics.rejectedMessages < 0) {
      errors.push('metrics.rejectedMessages must be a non-negative number');
    }
  }

  // telemetry
  if (!run.telemetry || typeof run.telemetry !== 'object') {
    errors.push('telemetry must be an object');
  } else {
    if (!run.telemetry.overflow || typeof run.telemetry.overflow.hasHorizontalOverflow !== 'boolean') {
      errors.push('telemetry.overflow.hasHorizontalOverflow must be a boolean');
    }
    if (!run.telemetry.frames || typeof run.telemetry.frames.avgFps !== 'number') {
      errors.push('telemetry.frames.avgFps must be a number');
    }
    if (run.telemetry.cls !== null && typeof run.telemetry.cls !== 'number') {
      errors.push('telemetry.cls must be a number or null');
    }
    if (typeof run.telemetry.tapTargetViolations !== 'number' || run.telemetry.tapTargetViolations < 0) {
      errors.push('telemetry.tapTargetViolations must be a non-negative number');
    }
  }

  // finalState
  if (!run.finalState || typeof run.finalState !== 'object') {
    errors.push('finalState must be an object with url and domDigest');
  } else {
    if (typeof run.finalState.url !== 'string') {
      errors.push('finalState.url must be a string');
    }
    if (typeof run.finalState.domDigest !== 'string') {
      errors.push('finalState.domDigest must be a string');
    }
  }

  // events
  if (!Array.isArray(run.events)) {
    errors.push('events must be an array');
  } else {
    if (run.events.length > MAX_EVENTS) {
      errors.push(`events.length (${run.events.length}) exceeds MAX_EVENTS (${MAX_EVENTS})`);
    }

    let prevSeq = 0;
    for (let i = 0; i < run.events.length; i++) {
      const ev = run.events[i];
      if (!ev || typeof ev !== 'object') {
        errors.push(`events[${i}] must be an object`);
        continue;
      }
      if (typeof ev.seq !== 'number' || ev.seq <= prevSeq) {
        errors.push(`events[${i}].seq must be strictly increasing (got ${ev.seq}, expected > ${prevSeq})`);
      }
      prevSeq = ev.seq;

      if (typeof ev.t_rel_ms !== 'number' || ev.t_rel_ms < 0) {
        errors.push(`events[${i}].t_rel_ms must be a non-negative number`);
      }
      if (typeof ev.type !== 'string' || !ev.type.trim()) {
        errors.push(`events[${i}].type must be a non-empty string`);
      }

      if (ev.coords) {
        if (typeof ev.coords.nx !== 'number' || ev.coords.nx < 0 || ev.coords.nx > 1) {
          errors.push(`events[${i}].coords.nx must be within [0, 1], got ${ev.coords.nx}`);
        }
        if (typeof ev.coords.ny !== 'number' || ev.coords.ny < 0 || ev.coords.ny > 1) {
          errors.push(`events[${i}].coords.ny must be within [0, 1], got ${ev.coords.ny}`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
