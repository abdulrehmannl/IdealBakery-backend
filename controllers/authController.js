/**
 * controllers/authController.js — Authentication Business Logic
 * ==============================================================
 * Auth methods supported:
 *   1. Google Sign-In  → POST /api/auth/google
 *   2. Phone OTP       → POST /api/auth/phone
 *
 * Email/password auth has been removed.
 *
 * Flow for both methods:
 *   Frontend completes Firebase auth → gets idToken →
 *   sends idToken here → we verify with Firebase Admin SDK →
 *   find or create User in MongoDB → issue httpOnly JWT cookie
 */

const jwt  = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Firebase Admin SDK — uses sub-package imports (firebase-admin v11+)
const { adminAuth } = require('../config/firebase');

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: generateToken
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Signs and returns a JWT token embedding the user's id and role.
 * The token is placed in an httpOnly cookie by each controller — never in
 * the response body — so JavaScript in the browser cannot read it.
 */
const generateToken = (id, role) => {
    return jwt.sign(
        { id, role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: setCookieAndRespond
// ─────────────────────────────────────────────────────────────────────────────
const setCookieAndRespond = (res, user, statusCode = 200) => {
    const token = generateToken(user._id, user.role);

    res.cookie('token', token, {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',   // HTTPS only in prod
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge:   7 * 24 * 60 * 60 * 1000,                // 7 days
    });

    return res.status(statusCode).json({
        success: true,
        message: `Welcome, ${user.name}!`,
        user: {
            id:       user._id,
            name:     user.name,
            email:    user.email    || null,
            phone:    user.phone    || null,
            photoURL: user.photoURL || null,
            role:     user.role,
            branch:   user.branch || null,
        },
    });
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 1: googleLogin
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Login or register via Google Sign-In (Firebase)
 * @route   POST /api/auth/google
 * @access  Public
 *
 * Body: { idToken: "<Firebase ID token from signInWithPopup>" }
 */
const googleLogin = async (req, res, next) => {
    try {
        const { idToken } = req.body;
        if (!idToken) {
            return res.status(400).json({
                success: false,
                message: 'Firebase ID token is required.',
            });
        }

        // Verify the token with Firebase Admin SDK
        const decoded = await adminAuth.verifyIdToken(idToken);
        const { uid, email, name: displayName, picture } = decoded;

        // Find existing user by Firebase UID
        let user = await User.findOne({ firebaseUid: uid }).populate('branch', 'name');

        if (!user) {
            // Check if they already have an account by email (link accounts)
            user = await User.findOne({ email: email?.toLowerCase() }).populate('branch', 'name');

            if (user) {
                // Link existing account to Google
                user.firebaseUid  = uid;
                user.authProvider = 'google';
                if (picture && !user.photoURL) user.photoURL = picture;
                await user.save();
            } else {
                // Brand-new user — create account
                user = await User.create({
                    name:         displayName || email.split('@')[0],
                    email:        email?.toLowerCase(),
                    photoURL:     picture || null,
                    firebaseUid:  uid,
                    authProvider: 'google',
                    role:         'customer',
                    isActive:     true,
                });
            }
        } else {
            // Update photo if it changed
            if (picture && user.photoURL !== picture) {
                user.photoURL = picture;
                await user.save();
            }
        }

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Your account has been deactivated. Contact admin.',
            });
        }

        return setCookieAndRespond(res, user, 200);

    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 2: registerPhone
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Register via Phone OTP (Firebase)
 * @route   POST /api/auth/register-phone
 * @access  Public
 *
 * Body: { idToken: "<Firebase ID token>", name: "<Name>", password: "<Password>" }
 */
const registerPhone = async (req, res, next) => {
    try {
        const { idToken, name, password, phone } = req.body;
        if (!idToken || !password || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Firebase ID token, phone number, and password are required.',
            });
        }

        // Verify the token with Firebase Admin SDK
        const decoded = await adminAuth.verifyIdToken(idToken);
        const { uid } = decoded;

        // Check if user already exists
        let user = await User.findOne({ phone });
        if (user) {
            return res.status(400).json({
                success: false,
                message: 'Account already exists with this phone number. Please login.',
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Brand-new user — create account
        user = await User.create({
            name:         name || `User_${phone?.slice(-4) || uid.slice(0, 6)}`,
            phone:        phone,
            password:     hashedPassword,
            firebaseUid:  uid,
            authProvider: 'phone',
            role:         'customer',
            isActive:     true,
        });

        return setCookieAndRespond(res, user, 201);
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 3: loginPhone
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Login via Phone + Password
 * @route   POST /api/auth/login-phone
 * @access  Public
 *
 * Body: { phone: "<Phone Number>", password: "<Password>" }
 */
const loginPhone = async (req, res, next) => {
    try {
        const { phone, password } = req.body;
        if (!phone || !password) {
            return res.status(400).json({
                success: false,
                message: 'Phone number and password are required.',
            });
        }

        console.log(`[loginPhone] Received phone: "${phone}"`);

        let user = await User.findOne({ phone }).select('+password').populate('branch', 'name');
        console.log(`[loginPhone] User found in DB:`, user ? `Yes (ID: ${user._id})` : 'No');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid phone number or password.',
            });
        }

        // ── Internal accounts and phone-OTP accounts both use phone+password ──
        // 'internal' = created by admin directly (no Firebase/OTP)
        // 'phone'    = registered by customer via OTP
        if (!['phone', 'internal'].includes(user.authProvider) || !user.password) {
            return res.status(401).json({
                success: false,
                message: 'Please login with Google instead.',
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        console.log(`[loginPhone] Password matches: ${isMatch}`);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid phone number or password.',
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Your account has been deactivated. Contact admin.',
            });
        }

        return setCookieAndRespond(res, user, 200);

    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 4: getMe
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Get current logged-in user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
    try {
        // req.user is set in the `protect` middleware
        res.status(200).json({
            success: true,
            user: {
                id:       req.user._id,
                name:     req.user.name,
                email:    req.user.email    || null,
                phone:    req.user.phone    || null,
                photoURL: req.user.photoURL || null,
                role:     req.user.role,
                branch:   req.user.branch   || null,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 5: logout
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Log user out / clear cookie
 * @route   POST /api/auth/logout
 * @access  Public
 */
const logout = async (req, res, next) => {
    try {
        res.cookie('token', 'none', {
            expires: new Date(Date.now() + 10 * 1000), // expire in 10 seconds
            httpOnly: true,
        });

        res.status(200).json({
            success: true,
            message: 'Logged out successfully',
        });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 6: resetPasswordPhone
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Reset password via Phone OTP (Firebase)
 * @route   POST /api/auth/reset-password-phone
 * @access  Public
 */
const resetPasswordPhone = async (req, res, next) => {
    try {
        const { idToken, phone, password } = req.body;
        if (!idToken || !phone || !password) {
            return res.status(400).json({ success: false, message: 'Missing required fields.' });
        }

        const decoded = await adminAuth.verifyIdToken(idToken);
        const { uid } = decoded;

        let user = await User.findOne({ phone, firebaseUid: uid });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found or phone number mismatch.' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();

        return setCookieAndRespond(res, user, 200);
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────
module.exports = { googleLogin, registerPhone, loginPhone, getMe, logout, resetPasswordPhone };

/*
 * END OF FILE SUMMARY
 * =====================
 * googleLogin  (POST /api/auth/google):
 *   1. Verifies Firebase idToken from signInWithPopup
 *   2. Finds or creates User (stores name, email, photoURL, firebaseUid)
 *   3. Issues httpOnly JWT cookie, returns user data
 *
 * phoneLogin  (POST /api/auth/phone):
 *   1. Verifies Firebase idToken from confirmationResult.confirm(otp)
 *   2. Finds or creates User (stores name, phone, firebaseUid)
 *   3. Issues httpOnly JWT cookie, returns user data
 *
 * JWT policy: httpOnly cookie, 7-day expiry, signed with JWT_SECRET
 * Password:   none — Firebase handles all credentials
 */
