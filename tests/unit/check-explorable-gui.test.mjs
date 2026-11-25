import assert from 'node:assert/strict';
import test from 'node:test';
import { lintNativeDialogs, lintText, lintTree } from '../../scripts/check-explorable-gui.mjs';

test('the tree passes the lint', () => {
  const violations = lintTree();
  assert.deepEqual(
    violations.map((v) => `${v.file}:${v.line} ${v.rule}`),
    []
  );
});

test('an island control without a test id fails', () => {
  const violations = lintText('<button id="x">Run</button>', { file: 'a.jsx', island: true });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].rule, 'island-control-without-testid');
});

test('a page-level control on an in-scope Astro page without a test id fails', () => {
  const violations = lintText('<button id="x">Run</button>', { file: 'responsive-lab.astro', inScopePage: true });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].rule, 'page-control-without-testid');
});

test('JSX arrow handlers inside attributes do not truncate opening tag scanning', () => {
  const withArrowFirst = lintText(
    '<button onClick={() => doThing("a>b")} data-testid="btn-arrow">Run</button>',
    { file: 'a.jsx', island: true }
  );
  assert.deepEqual(withArrowFirst, []);

  const missingAfterArrow = lintText(
    '<button onClick={() => doThing()} data-effect="persist">Run</button>',
    { file: 'a.jsx', island: true }
  );
  assert.ok(missingAfterArrow.some((v) => v.rule === 'island-control-without-testid'));
  assert.ok(missingAfterArrow.some((v) => v.rule === 'effect-without-testid'));
});

test('an unknown or untagged effect fails', () => {
  const unknown = lintText('<button data-testid="a" data-effect="spawn">x</button>', { file: 'a.jsx', island: true });
  assert.ok(unknown.some((v) => v.rule === 'unknown-effect'));
  const untagged = lintText('<button data-effect="persist">x</button>', { file: 'a.jsx', island: true });
  assert.ok(untagged.some((v) => v.rule === 'effect-without-testid'));
});

test('a native dialog call fails, a dialog element does not', () => {
  assert.ok(lintText('window.confirm("sure?")').some((v) => v.rule === 'native-dialog'));
  assert.ok(lintText('dialog.showModal()').every((v) => v.rule !== 'native-dialog'));
  assert.ok(lintText('const dialog = document.createElement("dialog")').every((v) => v.rule !== 'native-dialog'));
});

test('an onclick on a non-control fails', () => {
  const violations = lintText('<div onclick="go()">x</div>');
  assert.ok(violations.some((v) => v.rule === 'onclick-on-non-control'));
  assert.ok(lintText('<button onclick="go()" data-testid="b">x</button>', { island: true }).every((v) => v.rule !== 'onclick-on-non-control'));
});

test('DCI-04 native dialog scanner flags globalThis.prompt?.( and alert(, allows store.confirm( and function confirm(', () => {
  assert.equal(lintNativeDialogs('const x = globalThis.prompt?.("URL") ?? "";').length, 1);
  assert.equal(lintNativeDialogs('alert("blocked");').length, 1);
  assert.deepEqual(lintNativeDialogs('await store.confirm(id);'), []);
  assert.deepEqual(lintNativeDialogs('function confirm(x) { return x; }'), []);
});
