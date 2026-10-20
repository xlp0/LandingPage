/**
 * Event Ring Buffer (INV-ERB-01)
 * Fixed-capacity circular store for high-frequency interaction capture.
 * Ensures O(1) push, chronological snapshot, zero buffer growth, and explicit loss accounting.
 */

export class EventRingBuffer {
  /**
   * @param {Object} options
   * @param {number} [options.capacity=2048]
   */
  constructor({ capacity = 2048 } = {}) {
    if (
      typeof capacity !== 'number' ||
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      capacity > 2048
    ) {
      throw new RangeError(`Capacity must be an integer between 1 and 2048, got: ${capacity}`);
    }

    this._capacity = capacity;
    this._slots = new Array(capacity);
    this._size = 0;
    this._dropped = 0;
    this._head = 0;
    this._tail = 0;
    this._nextSeq = 1;
  }

  /**
   * Pushes an event into the circular buffer.
   * Stamped with a monotonic seq and shallow-frozen.
   * @param {Object} event
   * @returns {number} seq
   */
  push(event) {
    const seq = this._nextSeq++;
    const stamped = Object.freeze({ ...event, seq });

    if (this._size === this._capacity) {
      this._tail = (this._tail + 1) % this._capacity; // overwrite oldest slot
      this._dropped++;
    } else {
      this._size++;
    }

    this._slots[this._head] = stamped;
    this._head = (this._head + 1) % this._capacity;

    return seq;
  }

  /**
   * Returns all active events in chronological order (oldest -> newest).
   * @returns {ReadonlyArray<Object>}
   */
  snapshot() {
    const result = new Array(this._size);
    for (let i = 0; i < this._size; i++) {
      result[i] = this._slots[(this._tail + i) % this._capacity];
    }
    return Object.freeze(result);
  }

  /**
   * Clears buffer contents and drop counter while keeping nextSeq monotonic.
   */
  clear() {
    this._slots = new Array(this._capacity);
    this._size = 0;
    this._dropped = 0;
    this._head = 0;
    this._tail = 0;
  }

  /**
   * Returns current buffer diagnostics.
   * @returns {Object}
   */
  stats() {
    return {
      capacity: this._capacity,
      size: this._size,
      dropped: this._dropped,
      head: this._head,
      tail: this._tail,
      nextSeq: this._nextSeq
    };
  }
}
