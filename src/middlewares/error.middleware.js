


export const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode !== 200 ? res.statusCode : err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    })
}


export const notFoundHandler = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
}