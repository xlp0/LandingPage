import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  compileBaseline,
  httpStatusOf,
  unexpectedConsoleErrors,
  unexpectedHttpErrors,
  validateBaseline
} from '../../scripts/bombadil/baseline.mjs';

const BASELINE_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'bombadil',
  'baseline.json'
);

const validRow = {
  id: 'console-fresh-db',
  owner: 'database',
  reason: 'A fresh database answers the landing query with 404 until a card exists.',
  pattern: 'Failed to load resource: the server responded with a status of 404'
};

test('the committed baseline is well formed', () => {
  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  assert.deepEqual(validateBaseline(baseline), []);
});

test('rejects a row without an owner, a reason or a pattern', () => {
  const problems = validateBaseline({
    console: [{ id: 'x', owner: 'nobody', reason: 'short', pattern: 'boom' }],
    http: [{ id: 'y', owner: 'page', reason: 'A real reason for this row.', status: 200, pattern: 'boom' }]
  });
  assert.ok(problems.some((problem) => problem.includes('owner "nobody"')));
  assert.ok(problems.some((problem) => problem.includes('reason is missing')));
  assert.ok(problems.some((problem) => problem.includes('status 200 is not a 4xx or 5xx')));
});

test('rejects a pattern that matches every message', () => {
  const problems = validateBaseline({ console: [{ ...validRow, pattern: '.*' }], http: [] });
  assert.ok(problems.some((problem) => problem.includes('catch-all')), problems.join('\n'));
});

test('rejects a duplicate id across the two tables', () => {
  const problems = validateBaseline({
    console: [validRow],
    http: [{ ...validRow, status: 404, pattern: 'Failed to load resource' }]
  });
  assert.ok(problems.some((problem) => problem.includes('duplicate')));
});

test('classifies console errors into the console and HTTP tables', () => {
  const compiled = compileBaseline({
    console: [validRow],
    http: [{ ...validRow, id: 'http-404', status: 404, pattern: 'status of 404' }]
  });
  const texts = [
    'Failed to load resource: the server responded with a status of 404',
    'Unexpected failure while mounting the viewer',
    'Failed to load resource: the server responded with a status of 500'
  ];
  assert.equal(httpStatusOf(texts[0]), 404);
  assert.equal(httpStatusOf(texts[1]), null);
  assert.deepEqual(unexpectedConsoleErrors(texts, compiled), [texts[1]]);
  assert.deepEqual(unexpectedHttpErrors(texts, compiled), [texts[2]]);
});

test('an HTTP row needs the matching status', () => {
  const compiled = compileBaseline({
    console: [],
    http: [{ id: 'r', owner: 'server', reason: 'The legacy page logs one 404 on purpose.', status: 404, pattern: 'status of 404' }]
  });
  const texts = ['Failed to load resource: the server responded with a status of 404'];
  assert.deepEqual(unexpectedHttpErrors(texts, compiled), []);
  assert.deepEqual(
    unexpectedHttpErrors(['Failed to load resource: the server responded with a status of 405'], compiled).length,
    1
  );
});
