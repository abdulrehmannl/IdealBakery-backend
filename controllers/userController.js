/**
 * controllers/userController.js — Customer Management
 * ==========================================================
 * Admin-only CRUD for customer accounts.
 *
 * Routes (all mounted at /api/users, all admin-only):
 *   GET    /api/users           → getAllUsers
 *   GET    /api/users/:id       → getSingleUser
 *   POST   /api/users           → createUser
 *   PUT    /api/users/:id       → updateUser
 *   PATCH  /api/users/:id/toggle-status → toggleUserStatus (activate/deactivate)
 *   DELETE /api/users/:id       → deleteUser (hard delete — admin confirms)
 *
 * Key design decisions:
 *   - authProvider = 'internal' for admin-created customer accounts
 *   - Customers (role='customer') are fetched here.
 *   - Password is only changed if explicitly included in a PUT body
 */

const bcrypt = require('bcryptjs');
const User   = require('../models/User');

// ─────────────────────────────────────────────────────────────────────────────
// 1. getAllInternalUsers
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Get all internal users (staff + admin — NOT customers)
 * @route   GET /api/users
 * @access  Admin only
 * @query   ?role=staff|admin  ?isActive=true|false  ?branch=<branchId>
 */
const getAllUsers = async (req, res, next) => {
    try {
        const filter = {
            role: { $ne: 'customer' },
        };

        if (req.query.isActive !== undefined) {
            filter.isActive = req.query.isActive === 'true';
        }

        if (req.query.branch) {
            filter.branch = req.query.branch;
        }

        if (req.query.role) {
            filter.role = req.query.role;
        }

        const users = await User.find(filter)
            .select('-password')          // never send hashed password to frontend
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: users.length,
            users,
        });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. getSingleUser
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Get one internal user by ID
 * @route   GET /api/users/:id
 * @access  Admin only
 */
const getSingleUser = async (req, res, next) => {
    try {
        const user = await User.findOne({
            _id:  req.params.id,
            role: { $ne: 'customer' },
        })
            .select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.',
            });
        }

        res.status(200).json({ success: true, user });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. createInternalUser
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Admin creates a new staff/admin account
 * @route   POST /api/users
 * @access  Admin only
 *
 * Body:
 *   name        {string} required
 *   phone       {string} required — used as login credential
 *   password    {string} required — admin sets this; we hash it
 */
const createUser = async (req, res, next) => {
    try {
        const { name, phone, password } = req.body;

        // ── Validation ──
        if (!name || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, phone, and password are required.',
            });
        }


        // Check phone uniqueness
        const existing = await User.findOne({ phone });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'An account with this phone number already exists.',
            });
        }

        // ── Hash the password ──
        const salt           = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // ── Create the user ──
        const user = await User.create({
            name,
            phone,
            password:     hashedPassword,
            role:         'customer',
            authProvider: 'internal', // signals: created by admin, no Firebase
            isActive:     true,
        });

        // Return without password
        const userOut = await User.findById(user._id)
            .select('-password');

        res.status(201).json({
            success: true,
            message: `Account created for ${name}.`,
            user: userOut,
        });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3b. createStaff
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Admin creates a new internal staff/manager/delivery account
 * @route   POST /api/users/create-staff
 * @access  Admin only
 *
 * Body:
 *   name        {string} required
 *   phone       {string} required — used as login credential
 *   password    {string} required — admin sets this; we hash it
 *   role        {string} required (staff, manager, delivery, admin)
 *   branch      {ObjectId} required
 *   jobTitle    {string} optional
 */
const createStaff = async (req, res, next) => {
    try {
        const { name, phone, password, role, branch, jobTitle } = req.body;

        // ── Validation ──
        if (!name || !phone || !password || !role || !branch) {
            return res.status(400).json({
                success: false,
                message: 'Name, phone, password, role, and branch are required.',
            });
        }

        // Validate phone format (e.g. 03XXXXXXXXX)
        const phoneRegex = /^03\d{9}$/;
        if (!phoneRegex.test(phone.trim())) {
            return res.status(400).json({
                success: false,
                message: 'Phone number must be exactly 11 digits and start with 03 (e.g. 03001234567).',
            });
        }

        // Check phone uniqueness
        const existing = await User.findOne({ phone: phone.trim() });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'An account with this phone number already exists.',
            });
        }

        // ── Hash the password ──
        const salt           = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // ── Determine default salary based on role ──
        let baseSalary = 0;
        if (role === 'manager') baseSalary = 35000;
        else if (role === 'staff') baseSalary = 22000;
        else if (role === 'delivery') baseSalary = 20000;

        // ── Create the user ──
        const user = await User.create({
            name:         name.trim(),
            phone:        phone.trim(),
            password:     hashedPassword,
            role:         role,
            branch:       branch,
            jobTitle:     jobTitle ? jobTitle.trim() : undefined,
            authProvider: 'internal', // signals: created by admin, no Firebase
            isActive:     true,
            baseSalary:   baseSalary,
        });

        // Return without password, populated branch
        const userOut = await User.findById(user._id)
            .select('-password')
            .populate('branch', 'name');

        res.status(201).json({
            success: true,
            message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created for ${name}.`,
            user: userOut,
        });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. updateUser
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Update an internal user's details or reset password
 * @route   PUT /api/users/:id
 * @access  Admin only
 *
 * Body (all optional except what you want to change):
 *   name, phone, password (new password — will be hashed), isActive
 */
const updateUser = async (req, res, next) => {
    try {
        const { name, phone, password, isActive, role, branch, jobTitle } = req.body;

        // Fetch user
        const user = await User.findOne({
            _id:  req.params.id,
            role: { $ne: 'customer' },
        }).select('+password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.',
            });
        }

        // Check phone uniqueness if it's being changed
        if (phone && phone !== user.phone) {
            const clash = await User.findOne({ phone, _id: { $ne: user._id } });
            if (clash) {
                return res.status(400).json({
                    success: false,
                    message: 'Another account already uses that phone number.',
                });
            }
            user.phone = phone;
        }

        // Only update fields that were provided
        if (name     !== undefined) user.name     = name;
        if (isActive !== undefined) user.isActive = isActive;
        if (role     !== undefined) user.role     = role;
        if (branch   !== undefined) user.branch   = branch;
        if (jobTitle !== undefined) user.jobTitle = jobTitle.trim();

        // ── Password reset: only hash if a new password was sent ──
        if (password && password.trim().length > 0) {
            const salt           = await bcrypt.genSalt(10);
            user.password        = await bcrypt.hash(password, salt);
        }

        await user.save();

        const updated = await User.findById(user._id)
            .select('-password');

        res.status(200).json({
            success: true,
            message: 'User updated successfully.',
            user: updated,
        });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. toggleUserStatus
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Activate or deactivate a user (soft delete)
 * @route   PATCH /api/users/:id/toggle-status
 * @access  Admin only
 */
const toggleUserStatus = async (req, res, next) => {
    try {
        const user = await User.findOne({
            _id:  req.params.id,
            role: { $ne: 'customer' },
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Prevent admin from deactivating themselves
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'You cannot deactivate your own account.',
            });
        }

        user.isActive = !user.isActive;
        await user.save();

        res.status(200).json({
            success:  true,
            message:  `User ${user.isActive ? 'activated' : 'deactivated'} successfully.`,
            isActive: user.isActive,
        });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. deleteUser (hard delete — admin confirms in UI)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Permanently delete an internal user
 * @route   DELETE /api/users/:id
 * @access  Admin only
 *
 * NOTE: This is a hard delete. The UI shows a confirm dialog before calling this.
 * Admin cannot delete themselves.
 */
const deleteUser = async (req, res, next) => {
    try {
        const user = await User.findOne({
            _id:  req.params.id,
            role: { $ne: 'customer' },
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own account.',
            });
        }

        await User.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: `User "${user.name}" has been deleted.`,
        });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
    getAllUsers,
    getSingleUser,
    createUser,
    createStaff,
    updateUser,
    toggleUserStatus,
    deleteUser,
};

/*
 * END OF FILE SUMMARY
 * =====================
 * File: controllers/userController.js  Mounted: /api/users
 *
 * All operations exclude customers (role='customer').
 * authProvider='internal' marks admin-created accounts.
 * No Firebase involved — direct phone+password authentication.
 *
 * Security:
 *   - adminOnly middleware on all routes
 *   - Admin cannot deactivate or delete themselves
 *   - Passwords never returned in responses
 *   - Phone uniqueness enforced on create and update
 */
