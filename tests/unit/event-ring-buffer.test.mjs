import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { EventRingBuffer } from '../../js/harness/event-ring-buffer.js';

describe('EventRingBuffer (INV-ERB-01)', () => {
  test('initial state is empty with zero drops', () => {
    const buffer = new EventRingBuffer();
    const stats = buffer.stats();
    assert.equal(stats.capacity, 2048);
    assert.equal(stats.size, 0);
    assert.equal(stats.dropped, 0);
    assert.equal(stats.head, 0);
    assert.equal(stats.tail, 0);
    assert.equal(stats.nextSeq, 1);
    assert.deepEqual(buffer.snapshot(), []);
  });

  test('capacity validation rejects invalid sizes with RangeError', () => {
    assert.throws(() => new EventRingBuffer({ capacity: 0 }), RangeError);
    assert.throws(() => new EventRingBuffer({ capacity: 2049 }), RangeError);
    assert.throws(() => new EventRingBuffer({ capacity: 1.5 }), RangeError);
    assert.throws(() => new EventRingBuffer({ capacity: '8' }), RangeError);
    assert.throws(() => new EventRingBuffer({ capacity: -10 }), RangeError);

    // valid boundaries
    assert.doesNotThrow(() => new EventRingBuffer({ capacity: 1 }));
    assert.doesNotThrow(() => new EventRingBuffer({ capacity: 2048 }));
  });

  test('strict FIFO order below capacity', () => {
    const buffer = new EventRingBuffer({ capacity: 5 });
    const s1 = buffer.push({ type: 'pointerdown', x: 10 });
    const s2 = buffer.push({ type: 'pointerup', x: 20 });
    const s3 = buffer.push({ type: 'click', x: 20 });

    assert.equal(s1, 1);
    assert.equal(s2, 2);
    assert.equal(s3, 3);

    const snap = buffer.snapshot();
    assert.equal(snap.length, 3);
    assert.equal(snap[0].type, 'pointerdown');
    assert.equal(snap[1].type, 'pointerup');
    assert.equal(snap[2].type, 'click');
    assert.equal(buffer.stats().dropped, 0);
  });

  test('overflow wraps pointers, increments dropped, and snapshot remains chronological', () => {
    const buffer = new EventRingBuffer({ capacity: 3 });
    for (let i = 1; i <= 10; i++) {
      buffer.push({ i, type: `event-${i}` });
    }

    const stats = buffer.stats();
    assert.equal(stats.size, 3);
    assert.equal(stats.dropped, 7);
    assert.equal(stats.nextSeq, 11);

    const snap = buffer.snapshot();
    assert.equal(snap.length, 3);
    assert.deepEqual(snap.map((e) => e.seq), [8, 9, 10]);
    assert.deepEqual(snap.map((e) => e.i), [8, 9, 10]);

    // seq is gap-free: snapshot()[0].seq - 1 === dropped
    assert.equal(snap[0].seq - 1, stats.dropped);
  });

  test('pushed events are frozen shallowly', () => {
    const buffer = new EventRingBuffer({ capacity: 5 });
    buffer.push({ type: 'resize', width: 800 });
    const snap = buffer.snapshot();

    assert.equal(Object.isFrozen(snap[0]), true);
    assert.throws(() => {
      snap[0].width = 900;
    }, TypeError);
  });

  test('clear resets size, dropped, head, tail while keeping nextSeq monotonic', () => {
    const buffer = new EventRingBuffer({ capacity: 4 });
    buffer.push({ a: 1 });
    buffer.push({ a: 2 });
    buffer.push({ a: 3 });
    buffer.push({ a: 4 });
    buffer.push({ a: 5 }); // triggers drop

    assert.equal(buffer.stats().size, 4);
    assert.equal(buffer.stats().dropped, 1);

    buffer.clear();

    const stats = buffer.stats();
    assert.equal(stats.size, 0);
    assert.equal(stats.dropped, 0);
    assert.equal(stats.head, 0);
    assert.equal(stats.tail, 0);
    assert.equal(stats.nextSeq, 6); // monotonic sequence preserved!
    assert.deepEqual(buffer.snapshot(), []);

    // New push starts from seq 6
    const seq = buffer.push({ afterClear: true });
    assert.equal(seq, 6);
    assert.equal(buffer.snapshot()[0].seq, 6);
  });
});
