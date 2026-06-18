/**
 * middleware/auth.js — Authentication & Authorization Middleware
 * ==============================================================
 * Exports THREE middleware functions:
 *
 *   1. protect       → Verifies the user is LOGGED IN (has a valid JWT token)
 *   2. adminOnly     → Verifies the logged-in user is an admin
 *   3. staffOrAdmin  → Verifies the logged-in user is staff OR admin
 *
 * ROLES (3 total):
 *   - customer    → default role for anyone who registers
 *   - staff       → bakery staff (can manage orders, attendance, etc.)
 *   - admin       → full access to everything (set manually in MongoDB Atlas)
 *
 * USAGE IN ROUTES:
 * ────────────────
 *   const { protect, adminOnly, staffOrAdmin } = require('../middleware/auth');
 *
 *   router.get('/products', getAllProducts);                        // Public
 *   router.get('/profile',  protect, getProfile);                  // Any logged-in user
 *   router.delete('/staff', protect, adminOnly, deleteStaff);      // Admin only
 *   router.get('/orders',   protect, staffOrAdmin, getAllOrders);   // Staff + Admin
 */

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE 1: protect
// ─────────────────────────────────────────────────────────────────────────────
/**
 * protect — Ensures the request has a valid JWT token.
 * Reads from httpOnly cookie first, falls back to Authorization header.
 * Attaches the full user object to req.user if valid.
 */
const protect = async (req, res, next) => {
    let token;

    try {
        // ── Step 1: Extract the token ──
        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        } else if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized. No token provided. Please log in.',
            });
        }

        // ── Step 2: Verify the token ──
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // decoded = { id: '...', role: 'admin', iat: ..., exp: ... }

        // ── Step 3: Fetch the user from MongoDB ──
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User belonging to this token no longer exists.',
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Your account has been deactivated. Contact admin.',
            });
        }

        // ── Step 4: Attach user to req and proceed ──
        req.user = user;
        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. Please log in again.',
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token has expired. Please log in again.',
            });
        }
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE 2: adminOnly
// ─────────────────────────────────────────────────────────────────────────────
/**
 * adminOnly — Ensures the logged-in user is an admin.
 *
 * MUST be used AFTER protect (requires req.user to be set).
 *
 * Usage:
 *   router.delete('/staff/:id', protect, adminOnly, deleteStaff);
 */
const adminOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admins only.',
            // 403 = Forbidden: server knows who you are, but you can't do this.
        });
    }
    next();
};

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE 3: staffOrAdmin
// ─────────────────────────────────────────────────────────────────────────────
/**
 * staffOrAdmin — Ensures the logged-in user is staff OR admin.
 *
 * Use for routes that both bakery staff and admin should access:
 *   - Orders (view all / update status)
 *   - Attendance (mark / view)
 *   - Counter Sales
 *   - Inventory (view)
 *   - Staff Leave (apply / view)
 *
 * MUST be used AFTER protect (requires req.user to be set).
 *
 * Usage:
 *   router.get('/orders', protect, staffOrAdmin, getAllOrders);
 */
const staffOrAdmin = (req, res, next) => {
    const allowedRoles = ['admin', 'staff'];

    if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Staff or Admin only.',
        });
    }
    next();
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────
module.exports = { protect, adminOnly, staffOrAdmin };

/*
 * END OF FILE SUMMARY
 * =====================
 * File:    middleware/auth.js
 * Exports: { protect, adminOnly, staffOrAdmin }
 *
 * Roles:
 *   customer    → default; accesses only public + own data routes
 *   staff       → bakery workers; accesses orders, attendance, counter, inventory, leaves
 *   admin       → full access; set manually in MongoDB Atlas
 *
 * Middleware:
 *   protect       → any logged-in user (validates JWT, attaches req.user)
 *   adminOnly     → role === 'admin'
 *   staffOrAdmin  → role === 'admin' || role === 'staff'
 *
 * Error codes:
 *   401 → Not authenticated (no token / bad token / expired token)
 *   403 → Not authorized (wrong role)
 */
