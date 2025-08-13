import { ApiError } from "./ApiError.js";

/**
 * Industrial-grade validation utilities
 * Provides comprehensive input validation, sanitization, and security checks
 */

/**
 * Email validation with various security checks
 */
export const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!email || typeof email !== 'string') {
        throw new ApiError(400, "Email is required and must be a string");
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Basic format validation
    if (!emailRegex.test(trimmedEmail)) {
        throw new ApiError(400, "Invalid email format");
    }

    // Length validation
    if (trimmedEmail.length > 254) {
        throw new ApiError(400, "Email address too long");
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
        /[<>]/,  // HTML tags
        /javascript:/i,  // JavaScript injection
        /data:/i,  // Data URLs
        /vbscript:/i  // VBScript injection
    ];

    if (dangerousPatterns.some(pattern => pattern.test(trimmedEmail))) {
        throw new ApiError(400, "Email contains invalid characters");
    }

    return trimmedEmail;
};

/**
 * Password validation with strength requirements
 */
export const validatePassword = (password, options = {}) => {
    const {
        minLength = 8,
        maxLength = 128,
        requireUppercase = true,
        requireLowercase = true,
        requireNumbers = true,
        requireSpecialChars = true,
        forbiddenPatterns = []
    } = options;

    if (!password || typeof password !== 'string') {
        throw new ApiError(400, "Password is required and must be a string");
    }

    // Length validation
    if (password.length < minLength) {
        throw new ApiError(400, `Password must be at least ${minLength} characters long`);
    }

    if (password.length > maxLength) {
        throw new ApiError(400, `Password must not exceed ${maxLength} characters`);
    }

    // Character requirements
    const validations = [];

    if (requireUppercase && !/[A-Z]/.test(password)) {
        validations.push("at least one uppercase letter");
    }

    if (requireLowercase && !/[a-z]/.test(password)) {
        validations.push("at least one lowercase letter");
    }

    if (requireNumbers && !/\d/.test(password)) {
        validations.push("at least one number");
    }

    if (requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        validations.push("at least one special character");
    }

    if (validations.length > 0) {
        throw new ApiError(400, `Password must contain ${validations.join(", ")}`);
    }

    // Check for forbidden patterns
    const commonPatterns = [
        /(.)\1{2,}/,  // Repeated characters (3 or more)
        /123|abc|qwe/i,  // Sequential characters
        /password|admin|user/i,  // Common words
        ...forbiddenPatterns
    ];

    if (commonPatterns.some(pattern => pattern.test(password))) {
        throw new ApiError(400, "Password contains forbidden patterns or common words");
    }

    return password;
};

/**
 * Username validation
 */
export const validateUsername = (username) => {
    if (!username || typeof username !== 'string') {
        throw new ApiError(400, "Username is required and must be a string");
    }

    const trimmed = username.trim().toLowerCase();

    if (trimmed.length < 3 || trimmed.length > 30) {
        throw new ApiError(400, "Username must be between 3 and 30 characters");
    }

    if (!/^[a-z0-9_-]+$/.test(trimmed)) {
        throw new ApiError(400, "Username can only contain lowercase letters, numbers, underscores, and hyphens");
    }

    return trimmed;
};

/**
 * Phone number validation (international format)
 */
export const validatePhoneNumber = (phone) => {
    if (!phone || typeof phone !== 'string') {
        throw new ApiError(400, "Phone number is required and must be a string");
    }

    // Remove all non-digit characters except +
    const cleanPhone = phone.replace(/[^\d+]/g, '');

    // Basic international format validation
    const phoneRegex = /^\+?[1-9]\d{6,14}$/;

    if (!phoneRegex.test(cleanPhone)) {
        throw new ApiError(400, "Invalid phone number format");
    }

    return cleanPhone;
};

/**
 * Sanitize string input
 */
export const sanitizeString = (str, options = {}) => {
    const { maxLength = 100 } = options;

    if (!str || typeof str !== 'string') {
        throw new ApiError(400, "Input is required and must be a string");
    }

    // Trim and normalize whitespace
    const sanitized = str.trim().replace(/\s+/g, ' ');

    // Check length
    if (sanitized.length > maxLength) {
        throw new ApiError(400, `Input exceeds maximum length of ${maxLength} characters`);
    }

    // Check if empty after trimming
    if (sanitized.length === 0) {
        throw new ApiError(400, "Input cannot be empty");
    }

    return sanitized;
};

/**
 * Validate object ID (MongoDB ObjectId)
 */
export const validateObjectId = (id, fieldName = "ID") => {
    if (!id) {
        throw new ApiError(400, `${fieldName} is required`);
    }

    if (typeof id !== 'string') {
        throw new ApiError(400, `${fieldName} must be a string`);
    }

    // MongoDB ObjectId format validation
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        throw new ApiError(400, `Invalid ${fieldName} format`);
    }

    return id;
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (query) => {
    const { page = 1, limit = 10, sort = 'createdAt', order = 'desc' } = query;

    // Validate page
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
        throw new ApiError(400, "Page must be a positive number");
    }

    // Validate limit
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        throw new ApiError(400, "Limit must be between 1 and 100");
    }

    // Validate sort field
    const allowedSortFields = ['createdAt', 'updatedAt', 'name', 'email', 'username'];
    if (!allowedSortFields.includes(sort)) {
        throw new ApiError(400, `Invalid sort field. Allowed: ${allowedSortFields.join(', ')}`);
    }

    // Validate order
    if (!['asc', 'desc'].includes(order.toLowerCase())) {
        throw new ApiError(400, "Order must be 'asc' or 'desc'");
    }

    return {
        page: pageNum,
        limit: limitNum,
        sort,
        order: order.toLowerCase(),
        skip: (pageNum - 1) * limitNum
    };
};

/**
 * Validate file upload
 */
export const validateFileUpload = (file, options = {}) => {
    const {
        maxSize = 5 * 1024 * 1024, // 5MB default
        allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
        allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif']
    } = options;

    if (!file) {
        throw new ApiError(400, "File is required");
    }

    // Check file size
    if (file.size > maxSize) {
        throw new ApiError(400, `File size exceeds ${maxSize / (1024 * 1024)}MB limit`);
    }

    // Check MIME type
    if (!allowedTypes.includes(file.mimetype)) {
        throw new ApiError(400, `Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
    }

    // Check file extension
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension)) {
        throw new ApiError(400, `Invalid file extension. Allowed: ${allowedExtensions.join(', ')}`);
    }

    return true;
};

/**
 * Validate date range
 */
export const validateDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime())) {
        throw new ApiError(400, "Invalid start date");
    }

    if (isNaN(end.getTime())) {
        throw new ApiError(400, "Invalid end date");
    }

    if (start >= end) {
        throw new ApiError(400, "Start date must be before end date");
    }

    // Reasonable range limit (e.g., not more than 1 year)
    const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
    if (daysDiff > 365) {
        throw new ApiError(400, "Date range cannot exceed 365 days");
    }

    return { start, end };
};

/**
 * Comprehensive request validation middleware
 */
export const validateRequest = (schema) => {
    return (req, res, next) => {
        try {
            // Validate body
            if (schema.body) {
                Object.keys(schema.body).forEach(key => {
                    const value = req.body[key];
                    const validation = schema.body[key];

                    if (validation.required && (value === undefined || value === null || value === '')) {
                        throw new ApiError(400, `${key} is required`);
                    }

                    if (value !== undefined && validation.validator) {
                        validation.validator(value);
                    }
                });
            }

            // Validate query parameters
            if (schema.query) {
                Object.keys(schema.query).forEach(key => {
                    const value = req.query[key];
                    const validation = schema.query[key];

                    if (validation.required && !value) {
                        throw new ApiError(400, `Query parameter ${key} is required`);
                    }

                    if (value && validation.validator) {
                        validation.validator(value);
                    }
                });
            }

            // Validate URL parameters
            if (schema.params) {
                Object.keys(schema.params).forEach(key => {
                    const value = req.params[key];
                    const validation = schema.params[key];

                    if (validation.required && !value) {
                        throw new ApiError(400, `URL parameter ${key} is required`);
                    }

                    if (value && validation.validator) {
                        validation.validator(value);
                    }
                });
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};


export const validateEnum = (value, allowed, field = 'value') => {
    if (!allowed.includes(value)) {
        throw new ApiError(400, `${field} must be one of: ${allowed.join(', ')}`);
    }
    return value;
};


