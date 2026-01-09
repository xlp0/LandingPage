/**
 * SimpleDB - IndexedDB wrapper for MCard storage
 * 
 * Simplified browser implementation following mcard-js IndexedDBEngine patterns
 * Provides core storage operations with pagination support
 * 
 * @see https://www.npmjs.com/package/mcard-js
 */

import { MCard } from './MCard.js';

export class SimpleDB {
  constructor() {
    this.dbName = 'mcard-storage';
    this.storeName = 'cards';
    this.db = null;
  }
  
  /**
   * Initialize database
   * @returns {Promise<void>}
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'hash' });
        }
      };
    });
  }
  
  /**
   * Add or update a card
   * Matches mcard-js StorageEngine.add() API
   * 
   * @param {MCard} card
   * @returns {Promise<string>} - Returns the hash
   */
  async add(card) {
    const tx = this.db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    await store.put(card.toObject());
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(card.hash);
      tx.onerror = () => reject(tx.error);
    });
  }
  
  /**
   * Get a card by hash
   * @param {string} hash
   * @returns {Promise<MCard|null>}
   */
  async get(hash) {
    const tx = this.db.transaction(this.storeName, 'readonly');
    const store = tx.objectStore(this.storeName);
    const request = store.get(hash);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const obj = request.result;
        resolve(obj ? MCard.fromObject(obj) : null);
      };
      request.onerror = () => reject(request.error);
    });
  }
  
  /**
   * Get all cards
   * @returns {Promise<MCard[]>}
   */
  async getAll() {
    const tx = this.db.transaction(this.storeName, 'readonly');
    const store = tx.objectStore(this.storeName);
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const cards = request.result.map(obj => MCard.fromObject(obj));
        resolve(cards);
      };
      request.onerror = () => reject(request.error);
    });
  }
  
  /**
   * Delete a card
   * @param {string} hash
   * @returns {Promise<void>}
   */
  async delete(hash) {
    const tx = this.db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    await store.delete(hash);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  
  /**
   * Count total cards
   * @returns {Promise<number>}
   */
  async count() {
    const tx = this.db.transaction(this.storeName, 'readonly');
    const store = tx.objectStore(this.storeName);
    const request = store.count();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  /**
   * Get paginated results
   * Matches mcard-js StorageEngine.getPage() API
   * 
   * @param {number} pageNumber - Page number (0-indexed)
   * @param {number} pageSize - Items per page
   * @returns {Promise<{items: MCard[], total: number, page: number, pageSize: number}>}
   */
  async getPage(pageNumber = 0, pageSize = 20) {
    const total = await this.count();
    const allCards = await this.getAll();
    
    const start = pageNumber * pageSize;
    const end = start + pageSize;
    const items = allCards.slice(start, end);
    
    return {
      items,
      total,
      page: pageNumber,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }
  
  /**
   * Search cards by hash prefix
   * Matches mcard-js StorageEngine.searchByHash() API
   * 
   * @param {string} hashPrefix - Hash prefix to search
   * @returns {Promise<MCard[]>}
   */
  async searchByHash(hashPrefix) {
    const allCards = await this.getAll();
    return allCards.filter(card => card.hash.startsWith(hashPrefix));
  }
  
  /**
   * Clear all cards
   * @returns {Promise<void>}
   */
  async clear() {
    const tx = this.db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    await store.clear();
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
