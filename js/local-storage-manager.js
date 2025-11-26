/**
 * Local Storage Manager
 * 
 * Manages all local storage operations for THK Mesh
 * Provides a unified interface for storing and retrieving data
 */

(function(global) {
    class LocalStorageManager {
    constructor(config = {}) {
        this.prefix = config.prefix || 'thk-mesh-';
        this.debug = config.debug || false;
        this.initialized = false;
    }

    /**
     * Initialize local storage
     */
    init() {
        try {
            // Check if localStorage is available
            const test = '__thk-mesh-test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);

            // Mark as initialized
            const initKey = this.getKey('initialized');
            if (!localStorage.getItem(initKey)) {
                localStorage.setItem(initKey, JSON.stringify({
                    timestamp: new Date().toISOString(),
                    version: '1.0.0'
                }));
            }

            this.initialized = true;
            this.log('LocalStorage initialized successfully');
            return true;
        } catch (err) {
            console.error('[LocalStorageManager] Failed to initialize:', err);
            return false;
        }
    }

    /**
     * Get full storage key with prefix
     */
    getKey(key) {
        return this.prefix + key;
    }

    /**
     * Set a value in local storage
     */
    set(key, value) {
        try {
            const fullKey = this.getKey(key);
            const serialized = JSON.stringify(value);
            localStorage.setItem(fullKey, serialized);
            this.log(`Set ${key}:`, value);
            return true;
        } catch (err) {
            console.error(`[LocalStorageManager] Failed to set ${key}:`, err);
            return false;
        }
    }

    /**
     * Get a value from local storage
     */
    get(key, defaultValue = null) {
        try {
            const fullKey = this.getKey(key);
            const value = localStorage.getItem(fullKey);
            if (value === null) {
                return defaultValue;
            }
            const parsed = JSON.parse(value);
            this.log(`Get ${key}:`, parsed);
            return parsed;
        } catch (err) {
            console.error(`[LocalStorageManager] Failed to get ${key}:`, err);
            return defaultValue;
        }
    }

    /**
     * Remove a value from local storage
     */
    remove(key) {
        try {
            const fullKey = this.getKey(key);
            localStorage.removeItem(fullKey);
            this.log(`Removed ${key}`);
            return true;
        } catch (err) {
            console.error(`[LocalStorageManager] Failed to remove ${key}:`, err);
            return false;
        }
    }

    /**
     * Clear all THK Mesh data from local storage
     */
    clear() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
            this.log('Cleared all THK Mesh data');
            return true;
        } catch (err) {
            console.error('[LocalStorageManager] Failed to clear storage:', err);
            return false;
        }
    }

    /**
     * Get all keys in storage
     */
    keys() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(this.prefix)) {
                keys.push(key.replace(this.prefix, ''));
            }
        }
        return keys;
    }

    /**
     * Get storage size in bytes
     */
    getSize() {
        let size = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(this.prefix)) {
                const value = localStorage.getItem(key);
                size += key.length + value.length;
            }
        }
        return size;
    }

    /**
     * Export all data as JSON
     */
    export() {
        const data = {};
        this.keys().forEach(key => {
            data[key] = this.get(key);
        });
        return data;
    }

    /**
     * Import data from JSON
     */
    import(data) {
        try {
            Object.entries(data).forEach(([key, value]) => {
                this.set(key, value);
            });
            this.log('Data imported successfully');
            return true;
        } catch (err) {
            console.error('[LocalStorageManager] Failed to import data:', err);
            return false;
        }
    }

    /**
     * User management
     */
    setUser(userData) {
        return this.set('user', userData);
    }

    getUser() {
        return this.get('user', null);
    }

    clearUser() {
        this.remove('user');
        this.remove('auth-token');
    }

    /**
     * Authentication token management
     */
    setAuthToken(token) {
        return this.set('auth-token', token);
    }

    getAuthToken() {
        return this.get('auth-token', null);
    }

    /**
     * Document management
     */
    addDocument(doc) {
        const docs = this.getDocuments();
        const newDoc = {
            id: 'doc-' + Date.now(),
            ...doc,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        docs.push(newDoc);
        this.set('documents', docs);
        return newDoc;
    }

    getDocuments() {
        return this.get('documents', []);
    }

    getDocument(id) {
        const docs = this.getDocuments();
        return docs.find(doc => doc.id === id) || null;
    }

    updateDocument(id, updates) {
        const docs = this.getDocuments();
        const index = docs.findIndex(doc => doc.id === id);
        if (index !== -1) {
            docs[index] = {
                ...docs[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this.set('documents', docs);
            return docs[index];
        }
        return null;
    }

    deleteDocument(id) {
        const docs = this.getDocuments();
        const filtered = docs.filter(doc => doc.id !== id);
        this.set('documents', filtered);
        return true;
    }

    /**
     * Settings management
     */
    setSettings(settings) {
        return this.set('settings', settings);
    }

    getSettings() {
        return this.get('settings', {});
    }

    updateSettings(updates) {
        const current = this.getSettings();
        const updated = { ...current, ...updates };
        return this.setSettings(updated);
    }

    /**
     * Debug logging
     */
    log(...args) {
        if (this.debug) {
            console.log('[LocalStorageManager]', ...args);
        }
    }
}

    // Export to global
    global.LocalStorageManager = LocalStorageManager;
})(typeof window !== 'undefined' ? window : global);
