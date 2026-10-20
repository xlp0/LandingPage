import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTarget, createTargetMembrane } from '../../js/harness/target-membrane.js';

test('target-membrane: resolves relative URL against baseHref', () => {
  const base = 'http://localhost:3001/responsive-lab.html';
  const resolved = resolveTarget('app.html', base);
  assert.equal(resolved, 'http://localhost:3001/app.html');
});

test('target-membrane: resolves absolute URL', () => {
  const base = 'http://localhost:3001/responsive-lab.html';
  const resolved = resolveTarget('http://localhost:4321/preview', base);
  assert.equal(resolved, 'http://localhost:4321/preview');
});

test('target-membrane: rejects javascript: scheme', () => {
  const base = 'http://localhost:3001/responsive-lab.html';
  assert.throws(() => resolveTarget('javascript:alert(1)', base), {
    message: /scheme 'javascript:' is not allowed/
  });
});

test('target-membrane: rejects data: scheme', () => {
  const base = 'http://localhost:3001/responsive-lab.html';
  assert.throws(() => resolveTarget('data:text/html,<h1>hacked</h1>', base), {
    message: /scheme 'data:' is not allowed/
  });
});

test('target-membrane: rejects credentials in URL', () => {
  const base = 'http://localhost:3001/responsive-lab.html';
  assert.throws(() => resolveTarget('http://user:secret@localhost:4321/', base), {
    message: /credentials are not allowed/
  });
});

test('target-membrane: rejects empty or malformed inputs', () => {
  assert.throws(() => resolveTarget(''), { message: /malformed/ });
  assert.throws(() => resolveTarget(null), { message: /malformed/ });
});

test('target-membrane: bindTarget updates iframe and produces target detail', () => {
  const mockIframe = {
    src: '',
    attrs: {},
    setAttribute(name, val) { this.attrs[name] = val; }
  };
  let eventDetail = null;
  const membrane = createTargetMembrane({
    iframe: mockIframe,
    baseHref: 'http://localhost:3001/responsive-lab.html',
    onTargetChange: (d) => { eventDetail = d; }
  });

  const detail = membrane.bindTarget('app.html', 'boot-default');
  assert.equal(mockIframe.src, 'app.html');
  assert.equal(mockIframe.attrs['src'], 'app.html');
  assert.equal(detail.url, 'http://localhost:3001/app.html');
  assert.equal(detail.cause, 'boot-default');
  assert.equal(detail.origin, 'http://localhost:3001');
  assert.equal(detail.sameOrigin, false); // in node test environment
  assert.deepEqual(membrane.getTarget(), detail);
  assert.deepEqual(eventDetail, detail);
});
