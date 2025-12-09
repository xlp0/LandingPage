/**
 * SimpleDB - IndexedDB wrapper for MCard storage
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
   * @param {MCard} card
   * @returns {Promise<void>}
   */
  async add(card) {
    const tx = this.db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    await store.put(card.toObject());
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
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
}
