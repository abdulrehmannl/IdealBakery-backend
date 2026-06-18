/**
 * middleware/errorHandler.js — Global Error Handler
 * ==================================================
 * This is the LAST middleware in server.js. It catches ALL errors that are
 * passed using next(error) from any route or controller in the app.
 *
 * WHY DO WE NEED THIS?
 * ─────────────────────
 * Without this, if an error occurs in a controller, Express would either:
 *   a) Crash the server, or
 *   b) Send an ugly HTML error page to the API client
 *
 * With this handler, ALL errors are caught in one place and we always return
 * a clean, consistent JSON response like:
 *   { success: false, message: "Something went wrong" }
 *
 * HOW ERRORS REACH THIS HANDLER:
 * ───────────────────────────────
 * In any controller, when something goes wrong:
 *   try {
 *     ...
 *   } catch (error) {
 *     next(error);   ← This sends the error HERE
 *   }
 *
 * Express identifies this as an error handler because it has 4 parameters:
 *   (err, req, res, next)
 * A normal middleware has 3: (req, res, next)
 */

const errorHandler = (err, req, res, next) => {

    // ── Step 1: Log the error to the server console ──
    // This helps during development to see what went wrong.
    // In production, you'd send this to a logging service (like Sentry).
    console.error('─────────────────────────────────────────');
    console.error('❌ ERROR:', err.message);
    console.error('Stack:', err.stack);
    console.error('─────────────────────────────────────────');

    // ── Step 2: Copy the error so we can modify it without affecting original ──
    let statusCode = err.statusCode || 500;
    // Start with the error's status code, or default to 500 (Internal Server Error)

    let message = err.message || 'Internal Server Error';
    // Start with the error's message, or use a generic fallback

    // ─────────────────────────────────────────────────────────────────────────
    // CASE 1: Mongoose Validation Error
    // ─────────────────────────────────────────────────────────────────────────
    // Happens when required fields are missing or data doesn't match schema.
    // Example: Creating a User without the required 'email' field.
    // err.name = 'ValidationError'
    // err.errors = { email: { message: 'Path `email` is required.' } }
    if (err.name === 'ValidationError') {
        statusCode = 400;
        // Extract all validation messages and join them into one string.
        // Object.values() gets all error objects, then we map to their .message
        message = Object.values(err.errors)
            .map(val => val.message)
            .join(', ');
        // Example output: "Path `email` is required., Path `name` is required."
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CASE 2: Mongoose Duplicate Key Error
    // ─────────────────────────────────────────────────────────────────────────
    // Happens when you try to save a document with a value that must be unique
    // (marked unique: true in the schema), but that value already exists in DB.
    // Example: Registering with an email that's already in the database.
    // err.code = 11000 (MongoDB's specific error code for duplicates)
    if (err.code === 11000) {
        statusCode = 400;
        // err.keyValue tells us WHAT field was duplicated:
        // { email: 'test@test.com' } → we extract the field name
        const field = Object.keys(err.keyValue)[0];
        // Capitalize first letter for nicer message: "email" → "Email"
        const capitalizedField = field.charAt(0).toUpperCase() + field.slice(1);
        message = `${capitalizedField} already exists. Please use a different one.`;
        // Example: "Email already exists. Please use a different one."
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CASE 3: Mongoose CastError (Invalid MongoDB ObjectId)
    // ─────────────────────────────────────────────────────────────────────────
    // Happens when a route param like :id is not a valid MongoDB ObjectId.
    // Example: GET /api/products/notanid → fails to cast "notanid" to ObjectId
    // err.name = 'CastError', err.kind = 'ObjectId'
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
        statusCode = 400;
        message = `Invalid ID format: "${err.value}". Please provide a valid ID.`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CASE 4: JWT JsonWebTokenError
    // ─────────────────────────────────────────────────────────────────────────
    // Happens when a token is malformed (not a valid JWT format or tampered).
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid authentication token. Please log in again.';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CASE 5: JWT TokenExpiredError
    // ─────────────────────────────────────────────────────────────────────────
    // Happens when the token's expiry time (7 days) has passed.
    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Authentication token has expired. Please log in again.';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FINAL RESPONSE
    // ─────────────────────────────────────────────────────────────────────────
    // Send a clean, consistent JSON response for ALL errors.
    // Every error response follows the same structure so the frontend
    // always knows how to handle it.
    res.status(statusCode).json({
        success: false,
        message,
        // Only include the stack trace in development mode, not in production
        // (stack traces reveal internal code structure and are a security risk)
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

module.exports = errorHandler;

/*
 * END OF FILE SUMMARY
 * =====================
 * File:    middleware/errorHandler.js
 * Exports: errorHandler (default)
 *
 * Errors handled:
 *   Mongoose ValidationError   → 400 "Field X is required"
 *   MongoDB code 11000         → 400 "Email already exists"
 *   Mongoose CastError         → 400 "Invalid ID format"
 *   JWT JsonWebTokenError      → 401 "Invalid token"
 *   JWT TokenExpiredError      → 401 "Token expired"
 *   Everything else            → 500 "Internal Server Error"
 *
 * Response format (always):
 *   { success: false, message: "..." }
 *
 * How to trigger this handler from a controller:
 *   try { ... } catch (error) { next(error); }
 *
 * IMPORTANT: Must be the LAST app.use() in server.js
 */
