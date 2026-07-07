export const errorHandler = (err, req, res, next) => {
    console.error("Unhandled Error:", err);
    const status = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    res.status(status).json({
        success: false,
        status,
        message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
};
