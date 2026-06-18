/**
 * routes/authRoutes.js — Authentication Routes
 * ==============================================
 * Auth methods:
 *   POST /api/auth/google → Google Sign-In (signInWithPopup)
 *   POST /api/auth/phone  → Phone OTP (signInWithPhoneNumber)
 *
 * Email/password routes (/register, /login) have been removed.
 * Mounted in server.js as: app.use('/api/auth', authRoutes)
 */

const express = require('express');
const router  = express.Router();

const rateLimit = require('express-rate-limit');

// Rate limiter — max 50 Firebase auth attempts per IP per 15 minutes
// (raised for development testing)
const authLimiter = rateLimit({
    windowMs:        15 * 60 * 1000, // 15 minutes
    max:             50,
    message:         { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders:   false,
});

const { protect } = require('../middleware/auth');
const { googleLogin, registerPhone, loginPhone, getMe, logout } = require('../controllers/authController');

// ── POST /api/auth/google ─────────────────────────────────────────────────────
// Body: { idToken: "<Firebase ID token from signInWithPopup>" }
router.post('/google', authLimiter, googleLogin);

// ── POST /api/auth/register-phone ─────────────────────────────────────────────
// Body: { idToken: "<Firebase ID token>", name: "<Name>", password: "<Password>" }
router.post('/register-phone', authLimiter, registerPhone);

// ── POST /api/auth/login-phone ────────────────────────────────────────────────
// Body: { phone: "<Phone Number>", password: "<Password>" }
router.post('/login-phone', authLimiter, loginPhone);

// ── POST /api/auth/reset-password-phone ───────────────────────────────────────
// Body: { idToken: "<Firebase ID token>", phone: "<Phone Number>", password: "<Password>" }
const { resetPasswordPhone } = require('../controllers/authController');
router.post('/reset-password-phone', authLimiter, resetPasswordPhone);

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
// Requires valid JWT token
router.get('/me', protect, getMe);

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
// Clears httpOnly cookie
router.post('/logout', logout);

module.exports = router;
