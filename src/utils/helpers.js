import crypto from 'crypto';

/**
 * Simple logger with levels
 */
const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = process.env.LOG_LEVEL || 'info';

const shouldLog = (level) => LOG_LEVELS[level] <= LOG_LEVELS[currentLevel];

const createLogger = () => ({
    error: (message, meta = {}) => shouldLog('error') && console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        message,
        ...meta
    })),

    warn: (message, meta = {}) => shouldLog('warn') && console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'WARN',
        message,
        ...meta
    })),

    info: (message, meta = {}) => shouldLog('info') && console.info(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message,
        ...meta
    })),

    debug: (message, meta = {}) => shouldLog('debug') && console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'DEBUG',
        message,
        ...meta
    }))
});

export const logger = createLogger();

/**
 * Security utilities
 */
export const SecurityUtils = {
    // Generate secure random token
    generateToken: (length = 32) => crypto.randomBytes(length).toString('hex'),

    // Hash password with salt
    hashPassword: (password, salt = crypto.randomBytes(16).toString('hex')) => {
        const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
        return { hash, salt };
    },

    // Verify password against hash
    verifyPassword: (password, hash, salt) => {
        const verify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
        return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verify, 'hex'));
    },

    // Encrypt data
    encrypt: (text, key) => {
        if (!key) throw new Error('Encryption key required');

        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher('aes-256-cbc', key);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return {
            encrypted,
            iv: iv.toString('hex')
        };
    },

    // Decrypt data
    decrypt: ({ encrypted, iv }, key) => {
        if (!key) throw new Error('Decryption key required');

        const decipher = crypto.createDecipher('aes-256-cbc', key);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    },

    // Sanitize input string
    sanitize: (input) => {
        if (typeof input !== 'string') return '';

        return input
            .replace(/[<>'"&]/g, (char) => {
                const entityMap = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;' };
                return entityMap[char];
            })
            .trim()
            .slice(0, 1000);
    },

    // Basic SQL injection detection
    detectSQLInjection: (input) => {
        const sqlPattern = /(\b(union|select|insert|delete|update|drop|alter|truncate)\b)|(--|\/\*|\*\/)/i;
        return sqlPattern.test(input);
    },

    // Basic XSS detection
    detectXSS: (input) => {
        const xssPattern = /(<script>|javascript:|onerror=|onload=|alert\()/i;
        return xssPattern.test(input);
    },

    // Rate limiting check
    checkRateLimit: (key, max, windowMs) => {
        const now = Date.now();
        const requests = rateLimitStore.get(key) || [];
        const validRequests = requests.filter(time => now - time < windowMs);

        if (validRequests.length >= max) {
            return {
                allowed: false,
                remaining: 0,
                resetTime: now + windowMs
            };
        }

        validRequests.push(now);
        rateLimitStore.set(key, validRequests);

        return {
            allowed: true,
            remaining: Math.max(0, max - validRequests.length),
            resetTime: now + windowMs
        };
    }
};

/**
 * Rate limiting storage
 */
const rateLimitStore = new Map();

// Clean up old entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, requests] of rateLimitStore.entries()) {
        const validRequests = requests.filter(time => now - time < 60000);
        if (validRequests.length === 0) {
            rateLimitStore.delete(key);
        } else {
            rateLimitStore.set(key, validRequests);
        }
    }
}, 60000);

/**
 * Simple cache with TTL
 */
const cacheData = new Map();
const cacheTimers = new Map();

export const cache = {
    set: (key, value, ttl = 300000) => {
        // Clear existing timer
        const existingTimer = cacheTimers.get(key);
        if (existingTimer) clearTimeout(existingTimer);

        // Set new value and timer
        cacheData.set(key, value);
        const timer = setTimeout(() => cache.delete(key), ttl);
        cacheTimers.set(key, timer);
    },

    get: (key) => cacheData.get(key) || null,

    delete: (key) => {
        const timer = cacheTimers.get(key);
        if (timer) clearTimeout(timer);

        cacheData.delete(key);
        cacheTimers.delete(key);
    },

    clear: () => {
        cacheTimers.forEach(timer => clearTimeout(timer));
        cacheData.clear();
        cacheTimers.clear();
    },

    size: () => cacheData.size,

    has: (key) => cacheData.has(key)
};

/**
 * Async utilities
 */
export const asyncUtils = {
    // Sleep for specified milliseconds
    sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

    // Add timeout to promise
    timeout: (promise, ms) => Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
        )
    ]),

    // Retry function with exponential backoff
    retry: async (fn, attempts = 3, delay = 1000) => {
        let lastError;

        for (let i = 0; i < attempts; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;

                if (i === attempts - 1) break;

                const backoffDelay = delay * Math.pow(2, i);
                await asyncUtils.sleep(backoffDelay);
            }
        }

        throw lastError;
    },

    // Execute functions with concurrency limit
    concurrent: async (tasks, limit = 3) => {
        const results = [];
        const executing = [];

        for (const task of tasks) {
            const promise = Promise.resolve(task()).then(result => {
                executing.splice(executing.indexOf(promise), 1);
                return result;
            });

            results.push(promise);
            executing.push(promise);

            if (executing.length >= limit) {
                await Promise.race(executing);
            }
        }

        return Promise.all(results);
    }
};

/**
 * Performance monitoring
 */
export const PerformanceMonitor = () => {
    const startTime = process.hrtime.bigint();
    let dbQueries = 0;
    let cacheHits = 0;

    return {
        markDbQuery: (count = 1) => { dbQueries += count; },
        markCacheHit: (count = 1) => { cacheHits += count; },

        end: () => {
            const endTime = process.hrtime.bigint();
            const responseTime = Number(endTime - startTime) / 1_000_000;
            const memory = process.memoryUsage();

            return {
                responseTime: Math.round(responseTime * 100) / 100,
                dbQueries,
                cacheHits,
                memoryUsage: {
                    rss: Math.round(memory.rss / 1024 / 1024),
                    heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
                    heapTotal: Math.round(memory.heapTotal / 1024 / 1024)
                }
            };
        },

        getHealthStatus: () => ({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()),
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
            },
            environment: process.env.NODE_ENV,
            nodeVersion: process.version
        })
    };
};

/**
 * Utility functions
 */
export const utils = {
    // Generate random SKU
    generateSKU: (prefix = "PRD", digits = 5) => {
        const randomPart = crypto.randomInt(10 ** (digits - 1), 10 ** digits);
        return `${prefix}-${randomPart}`;
    },

    // Generate unique ID
    generateId: () => `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,

    // Format bytes to human readable
    formatBytes: (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // Deep clone object
    deepClone: (obj) => {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => utils.deepClone(item));
        if (typeof obj === 'object') {
            const cloned = {};
            Object.keys(obj).forEach(key => {
                cloned[key] = utils.deepClone(obj[key]);
            });
            return cloned;
        }
    },

    // Debounce function
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle function
    throttle: (func, limit) => {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};