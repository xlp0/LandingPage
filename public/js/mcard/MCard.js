/**
 * MCard Class
 * Content-addressable storage unit with SHA-256 hashing
 */

export class MCard {
  constructor(hash, content, g_time) {
    this.hash = hash;
    this.content = content;
    this.g_time = g_time;
  }
  
  /**
   * Create a new MCard from data
   * @param {string|Uint8Array} data - Content to store
   * @returns {Promise<MCard>}
   */
  static async create(data) {
    // Convert to Uint8Array if needed
    const bytes = typeof data === 'string' 
      ? new TextEncoder().encode(data)
      : data instanceof Uint8Array 
        ? data 
        : new Uint8Array(data);
    
    // Calculate SHA-256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Create timestamp
    const g_time = new Date().toISOString();
    
    return new MCard(hash, bytes, g_time);
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
   * @returns {string}
   */
  getContentAsText() {
    try {
      return new TextDecoder().decode(this.content);
    } catch {
      return '[Binary content]';
    }
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
