/**
 * MCard Class
 * Content-addressable storage unit with SHA-256 hashing
 * 
 * Simplified browser implementation following mcard-js library patterns
 * For full features, use mcard-js library in Node.js environment
 * 
 * @see https://www.npmjs.com/package/mcard-js
 */

export class MCard {
  constructor(hash, content, g_time) {
    this.hash = hash;
    this.content = content;
    this.g_time = g_time;
  }
  
  /**
   * Create a new MCard from data
   * Matches mcard-js MCard.create() API
   * 
   * @param {string|Uint8Array|ArrayBuffer} data - Content to store
   * @param {Object} options - Optional metadata
   * @returns {Promise<MCard>}
   */
  static async create(data, options = {}) {
    // Convert to Uint8Array if needed (handle multiple input types)
    let bytes;
    if (typeof data === 'string') {
      bytes = new TextEncoder().encode(data);
    } else if (data instanceof Uint8Array) {
      bytes = data;
    } else if (data instanceof ArrayBuffer) {
      bytes = new Uint8Array(data);
    } else if (ArrayBuffer.isView(data)) {
      bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    } else {
      throw new TypeError('Data must be string, Uint8Array, or ArrayBuffer');
    }
    
    // Calculate SHA-256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Create timestamp (GTime format from mcard-js)
    const g_time = options.g_time || new Date().toISOString();
    
    const card = new MCard(hash, bytes, g_time);
    card.metadata = options.metadata || {};
    
    return card;
  }
  
  /**
   * Get raw content
   * @returns {Uint8Array}
   */
  getContent() {
    return this.content;
  }
  
  /**
   * Get content as text
   * @param {string} encoding - Text encoding (default: 'utf-8')
   * @returns {string}
   */
  getContentAsText(encoding = 'utf-8') {
    try {
      return new TextDecoder(encoding).decode(this.content);
    } catch (error) {
      console.warn('[MCard] Failed to decode as text:', error.message);
      return '[Binary content]';
    }
  }
  
  /**
   * Get content size in bytes
   * @returns {number}
   */
  getSize() {
    return this.content.byteLength;
  }
  
  /**
   * Verify hash integrity
   * @returns {Promise<boolean>}
   */
  async verify() {
    const hashBuffer = await crypto.subtle.digest('SHA-256', this.content);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return computedHash === this.hash;
  }
  
  /**
   * Convert to plain object for storage
   * @returns {Object}
   */
  toObject() {
    return {
      hash: this.hash,
      content: Array.from(this.content),
      g_time: this.g_time
    };
  }
  
  /**
   * Create MCard from stored object
   * @param {Object} obj - Stored object
   * @returns {MCard}
   */
  static fromObject(obj) {
    return new MCard(
      obj.hash,
      new Uint8Array(obj.content),
      obj.g_time
    );
  }
}
