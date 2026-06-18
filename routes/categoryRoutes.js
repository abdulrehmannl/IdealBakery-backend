/**
 * routes/categoryRoutes.js — Category API Routes
 * ================================================
 * Mounted in server.js as: app.use('/api/categories', categoryRoutes)
 *
 * Full URL map:
 *   GET    /api/categories        → getAllCategories   (Public)
 *   GET    /api/categories/:id    → getSingleCategory (Public)
 *   POST   /api/categories        → createCategory    (Admin/Manager)
 *   PUT    /api/categories/:id    → updateCategory    (Admin/Manager)
 *   DELETE /api/categories/:id    → deleteCategory    (Admin/Manager)
 *
 * MIDDLEWARE CHAIN EXPLAINED:
 * ────────────────────────────
 * For an admin-only route like POST /api/categories:
 *   router.post('/', protect, adminOnly, createCategory)
 *                    ───────  ─────────  ──────────────
 *                    Step 1   Step 2     Step 3
 *   Step 1: protect   → checks JWT token is valid, attaches req.user
 *   Step 2: adminOnly → checks req.user.role is admin/manager
 *   Step 3: createCategory → runs if both checks pass
 */

const express = require('express');
const router = express.Router();

// ── Import middleware ──
const { protect, adminOnly } = require('../middleware/auth');
// protect:   verifies the user is logged in (has valid JWT)
// adminOnly: verifies the user is admin or manager

// ── Import controller functions ──
const {
    getAllCategories,
    getSingleCategory,
    createCategory,
    updateCategory,
    deleteCategory,
} = require('../controllers/categoryController');

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ROUTES — No token required
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/categories
 * @desc    Fetch all categories (used on homepage, menu page)
 * @access  Public
 */
router.get('/', getAllCategories);

/**
 * @route   GET /api/categories/:id
 * @desc    Fetch a single category by ID
 * @access  Public
 */
router.get('/:id', getSingleCategory);

// ─────────────────────────────────────────────────────────────────────────────
// PROTECTED ROUTES — Login required + Admin/Manager role
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/categories
 * @desc    Create a new category
 * @access  Private (Admin/Manager only)
 */
router.post('/', protect, adminOnly, createCategory);

/**
 * @route   PUT /api/categories/:id
 * @desc    Update an existing category
 * @access  Private (Admin/Manager only)
 */
router.put('/:id', protect, adminOnly, updateCategory);

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete a category permanently
 * @access  Private (Admin/Manager only)
 */
router.delete('/:id', protect, adminOnly, deleteCategory);

module.exports = router;

/*
 * END OF FILE SUMMARY
 * =====================
 * File:    routes/categoryRoutes.js
 * Mounted: /api/categories (server.js)
 *
 * Route        Method   Middleware              Controller
 * ──────────────────────────────────────────────────────────
 * /            GET      none                    getAllCategories
 * /:id         GET      none                    getSingleCategory
 * /            POST     protect, adminOnly      createCategory
 * /:id         PUT      protect, adminOnly      updateCategory
 * /:id         DELETE   protect, adminOnly      deleteCategory
 */
