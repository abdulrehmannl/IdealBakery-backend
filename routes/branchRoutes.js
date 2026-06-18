/**
 * routes/branchRoutes.js — Branch API Routes
 * ============================================
 * Mounted in server.js as: app.use('/api/branches', branchRoutes)
 *
 * Full URL map:
 *   GET    /api/branches        → getAllBranches   (Public)
 *   GET    /api/branches/:id    → getSingleBranch  (Public)
 *   POST   /api/branches        → createBranch     (Admin/Manager)
 *   PUT    /api/branches/:id    → updateBranch     (Admin/Manager)
 *   DELETE /api/branches/:id    → deleteBranch     (Admin/Manager)
 *
 * Branches are public for GET because:
 *   - The homepage shows all branch locations to visitors
 *   - No login required to see where branches are located
 * But only admins can create, update, or delete branches.
 */

const express = require('express');
const router = express.Router();

// ── Import middleware ──
const { protect, adminOnly } = require('../middleware/auth');

// ── Import controller functions ──
const {
    getAllBranches,
    getSingleBranch,
    createBranch,
    updateBranch,
    deleteBranch,
} = require('../controllers/branchController');

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/branches
 * @desc    Get all branches (supports ?isActive=true filter)
 * @access  Public
 */
router.get('/', getAllBranches);

/**
 * @route   GET /api/branches/:id
 * @desc    Get a single branch by ID
 * @access  Public
 */
router.get('/:id', getSingleBranch);

// ─────────────────────────────────────────────────────────────────────────────
// PROTECTED ROUTES — Admin/Manager only
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/branches
 * @desc    Create a new branch location
 * @access  Private (Admin/Manager)
 */
router.post('/', protect, adminOnly, createBranch);

/**
 * @route   PUT /api/branches/:id
 * @desc    Update branch details
 * @access  Private (Admin/Manager)
 */
router.put('/:id', protect, adminOnly, updateBranch);

/**
 * @route   DELETE /api/branches/:id
 * @desc    Delete a branch permanently
 * @access  Private (Admin/Manager)
 */
router.delete('/:id', protect, adminOnly, deleteBranch);

module.exports = router;

/*
 * END OF FILE SUMMARY
 * =====================
 * File:    routes/branchRoutes.js
 * Mounted: /api/branches (server.js)
 *
 * Route    Method   Middleware           Controller
 * ────────────────────────────────────────────────────
 * /        GET      none                 getAllBranches
 * /:id     GET      none                 getSingleBranch
 * /        POST     protect, adminOnly   createBranch
 * /:id     PUT      protect, adminOnly   updateBranch
 * /:id     DELETE   protect, adminOnly   deleteBranch
 */
