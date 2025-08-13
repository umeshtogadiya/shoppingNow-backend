import { ApiError } from './ApiError.js';
import crypto from 'crypto';

/**
 * Generate request ID
 */
const generateRequestId = () => `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

/**
 * Simple logger
 */
const logger = {
    info: (message, data) => console.log(`[INFO] ${message}`, data),
    warn: (message, data) => console.warn(`[WARN] ${message}`, data),
    error: (message, data) => console.error(`[ERROR] ${message}`, data)
};

/**
 * Request logging middleware
 */
export const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] || generateRequestId();

    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);

    logger.info('Request started', {
        requestId,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip
    });

    // Monitor response time
    const originalSend = res.send;
    res.send = function(data) {
        const duration = Date.now() - startTime;

        logger.info('Request completed', {
            requestId,
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            duration: `${duration}ms`
        });

        return originalSend.call(this, data);
    };

    next();
};

/**
 * Security headers middleware
 */
export const securityHeaders = (req, res, next) => {
    const headers = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    };

    // Set security headers
    Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
    });

    // HSTS for HTTPS
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    // Basic CSP
    res.setHeader('Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"
    );

    next();
};

/**
 * Input sanitization middleware
 */
export const sanitizeInput = (req, res, next) => {
    const sanitizeString = (str) => {
        if (typeof str !== 'string') return str;

        // Basic XSS protection
        return str
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '')
            .trim();
    };

    const sanitizeObject = (obj) => {
        if (Array.isArray(obj)) {
            return obj.map(item => sanitizeObject(item));
        }

        if (!obj || typeof obj !== 'object') return obj;

        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                sanitized[key] = sanitizeString(value);
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    };
    console.log("Incoming body:", req.body);
    console.log("Incoming query:", req.query);
    console.log("Incoming params:", req.params);

    try {
        if (req.body) req.body = sanitizeObject(req.body);
        if (req.query) req.query = sanitizeObject(req.query);
        if (req.params) req.params = sanitizeObject(req.params);

        next();
    } catch (error) {
        logger.warn('Input sanitization failed', { requestId: req.requestId, error: error.message });
        next(ApiError.badRequest('Invalid input format'));
        console.error("Sanitize error →", error.message, error.stack);
    }
};

/**
 * Rate limiting middleware
 */
export const rateLimit = (options = {}) => {
    const { windowMs = 60000, max = 100, message = 'Too many requests' } = options;
    const requests = new Map();

    return (req, res, next) => {
        const key = req.ip || 'unknown';
        const now = Date.now();
        const windowStart = now - windowMs;

        // Clean old entries
        const userRequests = (requests.get(key) || []).filter(time => time > windowStart);

        // Check limit
        if (userRequests.length >= max) {
            logger.warn('Rate limit exceeded', { ip: key, requestId: req.requestId });

            res.setHeader('X-RateLimit-Limit', max);
            res.setHeader('X-RateLimit-Remaining', 0);
            res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

            return res.status(429).json({
                success: false,
                statusCode: 429,
                message,
                requestId: req.requestId
            });
        }

        // Add current request
        userRequests.push(now);
        requests.set(key, userRequests);

        // Set headers
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, max - userRequests.length));
        res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

        next();
    };
};

/**
 * Request size limiting middleware
 */
export const requestSizeLimit = (maxSizeMB = 10) => {
    const maxBytes = maxSizeMB * 1024 * 1024;

    return (req, res, next) => {
        const contentLength = parseInt(req.headers['content-length'] || '0');

        if (contentLength > maxBytes) {
            logger.warn('Request size limit exceeded', {
                requestId: req.requestId,
                contentLength,
                maxBytes,
                ip: req.ip
            });

            return res.status(413).json({
                success: false,
                statusCode: 413,
                message: 'Request too large',
                requestId: req.requestId
            });
        }

        next();
    };
};

/**
 * CORS middleware
 */
export const corsMiddleware = (options = {}) => {
    const {
        origin = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders = ['Content-Type', 'Authorization', 'X-Request-ID'],
        credentials = true
    } = options;

    return (req, res, next) => {
        const requestOrigin = req.headers.origin;

        // Set CORS headers
        if (origin.includes('*') || origin.includes(requestOrigin)) {
            res.setHeader('Access-Control-Allow-Origin', requestOrigin || '*');
        }

        res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
        res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
        res.setHeader('Access-Control-Max-Age', '86400');

        if (credentials) {
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }

        // Handle preflight
        if (req.method === 'OPTIONS') {
            return res.status(204).end();
        }

        next();
    };
};

/**
 * Performance monitoring middleware
 */
export const performanceMonitor = (req, res, next) => {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    const originalSend = res.send;
    res.send = function(data) {
        const duration = Date.now() - startTime;
        const memoryUsed = process.memoryUsage().heapUsed - startMemory;

        // Log slow requests
        if (duration > 1000) {
            logger.warn('Slow request detected', {
                requestId: req.requestId,
                method: req.method,
                url: req.originalUrl,
                duration: `${duration}ms`,
                memoryUsed: `${Math.round(memoryUsed / 1024)}KB`
            });
        }

        return originalSend.call(this, data);
    };

    next();
};

/**
 * Error handling middleware
 */
export const errorHandler = (error, req, res, next) => {
    logger.error('API Error', {
        requestId: req.requestId,
        message: error.message,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip
    });

    // Handle ApiError
    if (error.name === 'ApiError') {
        return res.status(error.statusCode).json({
            success: false,
            statusCode: error.statusCode,
            message: error.message,
            requestId: req.requestId,
            errorId: error.errorId,
            ...(error.errors.length > 0 && { errors: error.errors })
        });
    }

    // Handle MongoDB errors
    if (error.code === 11000) {
        const field = Object.keys(error.keyValue || {})[0] || 'field';
        return res.status(409).json({
            success: false,
            statusCode: 409,
            message: `${field} already exists`,
            requestId: req.requestId
        });
    }

    if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors || {}).map(err => ({
            field: err.path,
            message: err.message
        }));

        return res.status(422).json({
            success: false,
            statusCode: 422,
            message: 'Validation failed',
            requestId: req.requestId,
            errors
        });
    }

    // Handle JWT errors
    const jwtErrors = {
        'JsonWebTokenError': { status: 401, message: 'Invalid token' },
        'TokenExpiredError': { status: 401, message: 'Token expired' },
        'NotBeforeError': { status: 401, message: 'Token not active' }
    };

    if (jwtErrors[error.name]) {
        const { status, message } = jwtErrors[error.name];
        return res.status(status).json({
            success: false,
            statusCode: status,
            message,
            requestId: req.requestId
        });
    }

    // Default error
    const statusCode = error.statusCode || 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : error.message;

    return res.status(statusCode).json({
        success: false,
        statusCode,
        message,
        requestId: req.requestId,
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
    });
};

/**
 * 404 handler middleware
 */
export const notFoundHandler = (req, res) => {
    logger.warn('Route not found', {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip
    });

    return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Route not found',
        requestId: req.requestId
    });
};

/**
 * Health check middleware
 */
export const healthCheck = (req, res) => {
    const uptime = process.uptime();
    const memory = process.memoryUsage();

    const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(uptime)}s`,
        memory: {
            used: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
            total: `${Math.round(memory.heapTotal / 1024 / 1024)}MB`
        },
        environment: process.env.NODE_ENV || 'development'
    };

    return res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Service is healthy',
        data: healthData,
        requestId: req.requestId
    });
};

/**
 * API documentation middleware
 */
export const apiDocs = (req, res) => {
    const docs = {
        name: 'API Service',
        version: process.env.API_VERSION || '1.0.0',
        description: 'RESTful API with authentication',
        endpoints: {
            '/health': 'GET - Health check',
            '/api/docs': 'GET - API documentation',
            '/api/v1/auth/register': 'POST - Register user',
            '/api/v1/auth/login': 'POST - Login user',
            '/api/v1/auth/logout': 'POST - Logout user',
            '/api/v1/users/profile': 'GET - Get user profile (auth required)'
        },
        security: {
            authentication: 'Bearer JWT Token',
            rateLimit: '100 requests/minute',
            cors: 'Configured origins only'
        }
    };

    return res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'API Documentation',
        data: docs,
        requestId: req.requestId
    });
};