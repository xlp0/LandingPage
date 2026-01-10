// FileLoaderV5 - Universal File Loading Module
// Highly reusable, supports multiple file types, caching, and progress tracking

class FileLoaderV5 {
    constructor(config = {}) {
        // Configuration with defaults
        this.config = {
            cache: config.cache !== false, // Enable caching by default
            timeout: config.timeout || 30000, // 30 second timeout
            retries: config.retries || 3, // Retry failed requests
            retryDelay: config.retryDelay || 1000, // 1 second between retries
            onProgress: config.onProgress || null, // Progress callback
            onError: config.onError || null, // Error callback
            baseUrl: config.baseUrl || '', // Base URL for relative paths
            headers: config.headers || {}, // Custom headers
            validateResponse: config.validateResponse || null // Custom validation
        };

        // Cache storage
        this.cache = new Map();
        
        // Active requests tracking (prevent duplicate requests)
        this.activeRequests = new Map();
        
        // Statistics
        this.stats = {
            totalRequests: 0,
            cacheHits: 0,
            cacheMisses: 0,
            errors: 0,
            totalBytes: 0
        };
    }

    /**
     * Load a file with automatic type detection
     * @param {string} url - URL or path to the file
     * @param {Object} options - Override config options
     * @returns {Promise<any>} Loaded file content
     */
    async load(url, options = {}) {
        const mergedOptions = { ...this.config, ...options };
        const fullUrl = this._resolveUrl(url, mergedOptions.baseUrl);
        const cacheKey = this._getCacheKey(fullUrl, mergedOptions);

        // Check cache first
        if (mergedOptions.cache && this.cache.has(cacheKey)) {
            this.stats.cacheHits++;
            return this.cache.get(cacheKey);
        }

        // Check if request is already in progress
        if (this.activeRequests.has(cacheKey)) {
            return this.activeRequests.get(cacheKey);
        }

        // Create new request
        const requestPromise = this._loadWithRetry(fullUrl, mergedOptions)
            .then(data => {
                // Cache the result
                if (mergedOptions.cache) {
                    this.cache.set(cacheKey, data);
                }
                
                // Remove from active requests
                this.activeRequests.delete(cacheKey);
                
                this.stats.cacheMisses++;
                return data;
            })
            .catch(error => {
                // Remove from active requests
                this.activeRequests.delete(cacheKey);
                
                this.stats.errors++;
                
                if (mergedOptions.onError) {
                    mergedOptions.onError(error, url);
                }
                
                throw error;
            });

        // Track active request
        this.activeRequests.set(cacheKey, requestPromise);
        this.stats.totalRequests++;

        return requestPromise;
    }

    /**
     * Load XML file (e.g., MusicXML)
     * @param {string} url - URL to XML file
     * @param {Object} options - Options
     * @returns {Promise<string>} XML content as string
     */
    async loadXML(url, options = {}) {
        return this.load(url, { ...options, type: 'xml' });
    }

    /**
     * Load JSON file
     * @param {string} url - URL to JSON file
     * @param {Object} options - Options
     * @returns {Promise<Object>} Parsed JSON object
     */
    async loadJSON(url, options = {}) {
        return this.load(url, { ...options, type: 'json' });
    }

    /**
     * Load text file
     * @param {string} url - URL to text file
     * @param {Object} options - Options
     * @returns {Promise<string>} Text content
     */
    async loadText(url, options = {}) {
        return this.load(url, { ...options, type: 'text' });
    }

    /**
     * Load binary file (ArrayBuffer)
     * @param {string} url - URL to binary file
     * @param {Object} options - Options
     * @returns {Promise<ArrayBuffer>} Binary data
     */
    async loadBinary(url, options = {}) {
        return this.load(url, { ...options, type: 'binary' });
    }

    /**
     * Load image file
     * @param {string} url - URL to image
     * @param {Object} options - Options
     * @returns {Promise<HTMLImageElement>} Loaded image element
     */
    async loadImage(url, options = {}) {
        const fullUrl = this._resolveUrl(url, options.baseUrl || this.config.baseUrl);
        const cacheKey = this._getCacheKey(fullUrl, options);

        // Check cache
        if (this.config.cache && this.cache.has(cacheKey)) {
            this.stats.cacheHits++;
            return this.cache.get(cacheKey);
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            
            if (options.crossOrigin) {
                img.crossOrigin = options.crossOrigin;
            }

            img.onload = () => {
                if (this.config.cache) {
                    this.cache.set(cacheKey, img);
                }
                this.stats.totalRequests++;
                this.stats.cacheMisses++;
                resolve(img);
            };

            img.onerror = () => {
                this.stats.errors++;
                reject(new Error(`Failed to load image: ${fullUrl}`));
            };

            img.src = fullUrl;
        });
    }

    /**
     * Load multiple files in parallel
     * @param {Array<string|Object>} files - Array of URLs or {url, type} objects
     * @param {Object} options - Options
     * @returns {Promise<Array>} Array of loaded file contents
     */
    async loadMultiple(files, options = {}) {
        const promises = files.map(file => {
            if (typeof file === 'string') {
                return this.load(file, options);
            } else {
                const { url, type, ...fileOptions } = file;
                return this.load(url, { ...options, ...fileOptions, type });
            }
        });

        return Promise.all(promises);
    }

    /**
     * Preload files (load and cache without returning)
     * @param {Array<string>} urls - Array of URLs to preload
     * @param {Object} options - Options
     * @returns {Promise<void>}
     */
    async preload(urls, options = {}) {
        await this.loadMultiple(urls, options);
    }

    /**
     * Clear cache
     * @param {string} url - Optional specific URL to clear, or clear all if not provided
     */
    clearCache(url = null) {
        if (url) {
            const fullUrl = this._resolveUrl(url, this.config.baseUrl);
            const cacheKey = this._getCacheKey(fullUrl, this.config);
            this.cache.delete(cacheKey);
        } else {
            this.cache.clear();
        }
    }

    /**
     * Get cache statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.cache.size,
            activeRequests: this.activeRequests.size,
            hitRate: this.stats.totalRequests > 0 
                ? (this.stats.cacheHits / this.stats.totalRequests * 100).toFixed(2) + '%'
                : '0%'
        };
    }

    /**
     * Internal: Load with retry logic
     * @private
     */
    async _loadWithRetry(url, options, attempt = 1) {
        try {
            return await this._fetchFile(url, options);
        } catch (error) {
            if (attempt < options.retries) {
                console.warn(`Retry ${attempt}/${options.retries} for ${url}`);
                await this._delay(options.retryDelay);
                return this._loadWithRetry(url, options, attempt + 1);
            }
            throw error;
        }
    }

    /**
     * Internal: Fetch file with timeout
     * @private
     */
    async _fetchFile(url, options) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout);

        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: options.headers
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Custom validation
            if (options.validateResponse && !options.validateResponse(response)) {
                throw new Error('Response validation failed');
            }

            // Track progress if callback provided
            if (options.onProgress && response.body) {
                return this._fetchWithProgress(response, options.onProgress);
            }

            // Determine type and parse accordingly
            const type = options.type || this._detectType(url, response);
            return this._parseResponse(response, type);

        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error(`Request timeout: ${url}`);
            }
            
            throw error;
        }
    }

    /**
     * Internal: Fetch with progress tracking
     * @private
     */
    async _fetchWithProgress(response, onProgress) {
        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        let loaded = 0;

        const reader = response.body.getReader();
        const chunks = [];

        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            chunks.push(value);
            loaded += value.length;
            
            if (onProgress) {
                onProgress({ loaded, total, percentage: total ? (loaded / total * 100) : 0 });
            }
        }

        // Combine chunks
        const allChunks = new Uint8Array(loaded);
        let position = 0;
        for (const chunk of chunks) {
            allChunks.set(chunk, position);
            position += chunk.length;
        }

        this.stats.totalBytes += loaded;

        return allChunks.buffer;
    }

    /**
     * Internal: Parse response based on type
     * @private
     */
    async _parseResponse(response, type) {
        switch (type) {
            case 'json':
                return response.json();
            case 'text':
            case 'xml':
                return response.text();
            case 'binary':
            case 'arraybuffer':
                return response.arrayBuffer();
            case 'blob':
                return response.blob();
            default:
                return response.text();
        }
    }

    /**
     * Internal: Detect file type from URL or response
     * @private
     */
    _detectType(url, response) {
        // Check Content-Type header
        const contentType = response.headers.get('content-type');
        if (contentType) {
            if (contentType.includes('json')) return 'json';
            if (contentType.includes('xml')) return 'xml';
            if (contentType.includes('text')) return 'text';
        }

        // Check file extension
        const ext = url.split('.').pop().toLowerCase();
        const typeMap = {
            'json': 'json',
            'xml': 'xml',
            'musicxml': 'xml',
            'txt': 'text',
            'csv': 'text',
            'bin': 'binary',
            'dat': 'binary'
        };

        return typeMap[ext] || 'text';
    }

    /**
     * Internal: Resolve URL with base URL
     * @private
     */
    _resolveUrl(url, baseUrl) {
        if (!baseUrl || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
            return url;
        }
        return baseUrl + (baseUrl.endsWith('/') ? '' : '/') + url;
    }

    /**
     * Internal: Generate cache key
     * @private
     */
    _getCacheKey(url, options) {
        // Include relevant options in cache key
        const keyParts = [url];
        if (options.type) keyParts.push(options.type);
        return keyParts.join('|');
    }

    /**
     * Internal: Delay helper
     * @private
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Dispose and cleanup
     */
    dispose() {
        this.cache.clear();
        this.activeRequests.clear();
        this.stats = {
            totalRequests: 0,
            cacheHits: 0,
            cacheMisses: 0,
            errors: 0,
            totalBytes: 0
        };
    }
}
