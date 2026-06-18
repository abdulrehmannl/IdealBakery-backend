const mongoose = require('mongoose');

/**
 * User model — IdealBakery
 * ========================
 * Supports two auth methods:
 *   1. Google Sign-In  (authProvider: 'google')
 *   2. Phone OTP       (authProvider: 'phone')
 *
 * Email/password auth has been removed.
 * Phone number is always stored when available (required for phone auth,
 * optional for Google — collected later at the order page).
 */
const userSchema = new mongoose.Schema(
    {
        name: {
            type:     String,
            required: true,
            trim:     true,
        },

        // ── Google fields ──────────────────────────────────────
        email: {
            type:     String,
            trim:     true,
            lowercase: true,
        },

        photoURL: {
            type: String, // Google profile picture URL
        },

        // ── Phone fields ───────────────────────────────────────
        phone: {
            type: String,
            trim: true,
        },

        password: {
            type: String,
            select: false, // Don't return password in normal queries
        },

        // ── Firebase ───────────────────────────────────────────
        firebaseUid: {
            type:   String,
            unique: true,
            sparse: true, // allows multiple null values (safe for upsert)
        },

        authProvider: {
            type:    String,
            enum:    ['google', 'phone', 'internal'],
            required: true,
        },

        // ── App fields ─────────────────────────────────────────
        role: {
            type:    String,
            enum:    ['customer', 'manager', 'staff', 'delivery', 'admin'],
            default: 'customer',
        },

        isActive: {
            type:    Boolean,
            default: true,
        },

        address: {
            type: String,
            trim: true,
        },

        // ── Internal staff fields (set by admin, not Firebase) ──
        // branch: which branch this staff member is assigned to
        branch: {
            type: mongoose.Schema.Types.ObjectId,
            ref:  'Branch',
            default: null,
        },

        // jobTitle: display label, e.g. "Manager", "Delivery Rider"
        jobTitle: {
            type:    String,
            trim:    true,
            default: null,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
