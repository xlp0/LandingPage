// WebRTC Dashboard Utilities
// Common utility functions

export class Utils {
    // Generate unique IDs
    static generateId(prefix = 'id') {
        return `${prefix}_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
    }
    
    // Generate room names
    static generateRoomName() {
        const adjectives = [
            'Quick', 'Epic', 'Fun', 'Cool', 'Smart', 'Fast', 'Wild', 'Super',
            'Bright', 'Happy', 'Swift', 'Bold', 'Clever', 'Smooth', 'Sharp'
        ];
        
        const nouns = [
            'Chat', 'Talk', 'Meet', 'Hub', 'Space', 'Zone', 'Room', 'Lounge',
            'Circle', 'Group', 'Team', 'Squad', 'Crew', 'Gang', 'Club'
        ];
        
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        const num = Math.floor(Math.random() * 1000);
        
        return `${adj} ${noun} ${num}`;
    }
    
    // Validate room data
    static validateRoomData(roomData) {
        const errors = [];
        
        if (!roomData.name || roomData.name.trim().length === 0) {
            errors.push('Room name is required');
        }
        
        if (roomData.name && roomData.name.length > 50) {
            errors.push('Room name must be 50 characters or less');
        }
        
        if (roomData.description && roomData.description.length > 200) {
            errors.push('Room description must be 200 characters or less');
        }
        
        if (roomData.maxParticipants && (roomData.maxParticipants < 2 || roomData.maxParticipants > 100)) {
            errors.push('Max participants must be between 2 and 100');
        }
        
        return errors;
    }
    
    // Validate user data
    static validateUserData(userData) {
        const errors = [];
        
        if (!userData.name || userData.name.trim().length === 0) {
            errors.push('Name is required');
        }
        
        if (userData.name && userData.name.length > 30) {
            errors.push('Name must be 30 characters or less');
        }
        
        if (userData.name && !/^[a-zA-Z0-9\s\-_]+$/.test(userData.name)) {
            errors.push('Name can only contain letters, numbers, spaces, hyphens, and underscores');
        }
        
        return errors;
    }
    
    // Sanitize text input
    static sanitizeText(text, maxLength = 1000) {
        if (typeof text !== 'string') {
            return '';
        }
        
        return text
            .trim()
            .substring(0, maxLength)
            .replace(/[<>]/g, ''); // Remove potential HTML tags
    }
    
    // Format file size
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Debounce function
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Throttle function
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    // Deep clone object
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        
        if (obj instanceof Array) {
            return obj.map(item => Utils.deepClone(item));
        }
        
        if (typeof obj === 'object') {
            const cloned = {};
            Object.keys(obj).forEach(key => {
                cloned[key] = Utils.deepClone(obj[key]);
            });
            return cloned;
        }
    }
    
    // Check if object is empty
    static isEmpty(obj) {
        if (obj == null) return true;
        if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
        return Object.keys(obj).length === 0;
    }
    
    // Get browser info
    static getBrowserInfo() {
        const ua = navigator.userAgent;
        let browser = 'Unknown';
        let version = 'Unknown';
        
        if (ua.indexOf('Chrome') > -1) {
            browser = 'Chrome';
            version = ua.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
        } else if (ua.indexOf('Firefox') > -1) {
            browser = 'Firefox';
            version = ua.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
        } else if (ua.indexOf('Safari') > -1) {
            browser = 'Safari';
            version = ua.match(/Version\/(\d+)/)?.[1] || 'Unknown';
        } else if (ua.indexOf('Edge') > -1) {
            browser = 'Edge';
            version = ua.match(/Edge\/(\d+)/)?.[1] || 'Unknown';
        }
        
        return { browser, version };
    }
    
    // Check WebRTC support
    static checkWebRTCSupport() {
        const support = {
            webrtc: false,
            datachannel: false,
            getusermedia: false
        };
        
        // Check WebRTC support
        if (window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection) {
            support.webrtc = true;
        }
        
        // Check DataChannel support
        try {
            const pc = new (window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection)();
            if (pc.createDataChannel) {
                support.datachannel = true;
            }
            pc.close();
        } catch (e) {
            // DataChannel not supported
        }
        
        // Check getUserMedia support
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            support.getusermedia = true;
        } else if (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia) {
            support.getusermedia = true;
        }
        
        return support;
    }
    
    // Local storage utilities
    static saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.warn('Failed to save to localStorage:', error);
            return false;
        }
    }
    
    static loadFromStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn('Failed to load from localStorage:', error);
            return defaultValue;
        }
    }
    
    static removeFromStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn('Failed to remove from localStorage:', error);
            return false;
        }
    }
    
    // URL utilities
    static parseUrlParams(url = window.location.href) {
        const params = new URLSearchParams(new URL(url).search);
        const result = {};
        
        for (const [key, value] of params) {
            result[key] = value;
        }
        
        return result;
    }
    
    static buildUrl(baseUrl, params = {}) {
        const url = new URL(baseUrl);
        
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                url.searchParams.set(key, params[key]);
            }
        });
        
        return url.toString();
    }
    
    // Time utilities
    static formatRelativeTime(timestamp) {
        const now = new Date();
        const date = new Date(timestamp);
        const diffMs = now - date;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffSecs < 60) {
            return 'just now';
        } else if (diffMins < 60) {
            return `${diffMins}m ago`;
        } else if (diffHours < 24) {
            return `${diffHours}h ago`;
        } else if (diffDays < 7) {
            return `${diffDays}d ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
    
    // Color utilities
    static generateColor(seed) {
        // Generate a consistent color based on a seed string
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = seed.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 70%, 50%)`;
    }
    
    // Error handling utilities
    static handleError(error, context = 'Unknown') {
        console.error(`[${context}] Error:`, error);
        
        // In production, you might want to send errors to a logging service
        if (window.errorLogger) {
            window.errorLogger.log(error, context);
        }
        
        return {
            message: error.message || 'An unknown error occurred',
            context,
            timestamp: new Date().toISOString()
        };
    }
    
    // Performance utilities
    static measurePerformance(name, fn) {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        
        console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
        
        return result;
    }
    
    // Async utilities
    static async retry(fn, maxAttempts = 3, delay = 1000) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                console.warn(`Attempt ${attempt} failed:`, error.message);
                
                if (attempt < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError;
    }
    
    static timeout(promise, ms) {
        return Promise.race([
            promise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Operation timed out')), ms)
            )
        ]);
    }
}
