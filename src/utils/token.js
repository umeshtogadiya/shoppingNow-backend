import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from "dotenv";



dotenv.config({
    path: './.env'
})


// Error handling
const createError = (message, code = 'TOKEN_ERROR') => {
    const error = new Error(message);
    error.code = code;
    return error;
};

// Token generation
export const generateAccessToken = (payload) => {
    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!secret) throw createError('JWT_SECRET not configured', 'MISSING_SECRET');
    if (!payload) throw createError('Payload required', 'MISSING_PAYLOAD');

    return jwt.sign(
        { ...payload, jti: crypto.randomUUID() },
        secret,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m' }
    );
};

export const generateRefreshToken = (payload) => {
    const secret = process.env.REFRESH_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET;
    if (!secret) throw createError('JWT secret not configured', 'MISSING_SECRET');
    if (!payload?.userId) throw createError('User ID required', 'MISSING_USER_ID');

    return jwt.sign(
        {
            userId: payload.userId,
            email: payload.email,
            jti: crypto.randomUUID()
        },
        secret,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' }
    );
};

// Token verification
export const verifyToken = (token, isRefresh = false) => {
    if (!token) throw createError('Token required', 'MISSING_TOKEN');

    const secret = isRefresh
        ? (process.env.REFRESH_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET)
        : process.env.ACCESS_TOKEN_SECRET;

    if (!secret) throw createError('JWT secret not configured', 'MISSING_SECRET');

    try {
        return jwt.verify(token, secret);
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw createError('Token expired', 'TOKEN_EXPIRED');
        }
        if (error.name === 'JsonWebTokenError') {
            throw createError('Invalid token', 'TOKEN_INVALID');
        }
        throw error;
    }
};

// Utility functions
export const extractToken = (req) => {
    const auth = req.headers?.authorization;
    return auth?.startsWith('Bearer ') ? auth.split(' ')[1] : null;
};

export const generateTokenPair = (payload) => {
    const cleanPayload = { ...payload };
    delete cleanPayload.password;
    delete cleanPayload.refreshToken;

    return {
        accessToken: generateAccessToken(cleanPayload),
        refreshToken: generateRefreshToken(payload),
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m'
    };
};

export const refreshAccessToken = (refreshToken) => {
    const decoded = verifyToken(refreshToken, true);
    return {
        accessToken: generateAccessToken({
            userId: decoded.userId,
            email: decoded.email
        }),
        expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m'
    };
};

// Simple blacklist
export const createBlacklist = () => {
    const tokens = new Set();
    return {
        add: (tokenId) => tokens.add(tokenId),
        has: (tokenId) => tokens.has(tokenId),
        clear: () => tokens.clear()
    };
};

// Authentication middleware
export const authenticate = (blacklist = null) => async (req, res, next) => {
    try {
        const token = extractToken(req);
        if (!token) {
            return res.status(401).json({
                error: 'Access token required',
                code: 'MISSING_TOKEN'
            });
        }

        const decoded = verifyToken(token);

        if (blacklist?.has(decoded.jti)) {
            return res.status(401).json({
                error: 'Token revoked',
                code: 'TOKEN_REVOKED'
            });
        }

        req.user = decoded;
        req.token = token;
        next();
    } catch (error) {
        const status = ['TOKEN_EXPIRED', 'TOKEN_INVALID'].includes(error.code) ? 401 : 500;
        res.status(status).json({
            error: error.message,
            code: error.code
        });
    }
};