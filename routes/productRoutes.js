/**
 * routes/productRoutes.js — Product API Routes
 * ==============================================
 * Mounted in server.js as: app.use('/api/products', productRoutes)
 *
 * Full URL map:
 *   GET    /api/products        → getAllProducts   (Public)
 *   GET    /api/products/:id    → getSingleProduct (Public)
 *   POST   /api/products        → createProduct    (Admin/Manager)
 *   PUT    /api/products/:id    → updateProduct    (Admin/Manager)
 *   DELETE /api/products/:id    → deleteProduct    (Admin/Manager)
 *
 * WHY ARE GET ROUTES PUBLIC?
 * ───────────────────────────
 * Products are shown on the public menu/homepage.
 * A visitor should be able to browse all products without an account.
 * Only CREATING, EDITING, or DELETING products requires admin login.
 *
 * QUERY FILTERS SUPPORTED ON GET /api/products:
 * ───────────────────────────────────────────────
 *   ?category=<id>        → products in a specific category
 *   ?branch=<id>          → products available at a specific branch
 *   ?isAvailable=true     → only in-stock/available products
 *   ?tags=bestseller      → products with a specific tag
 */

const express = require('express');
const router = express.Router();

// ── Import middleware ──
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

// ── Import controller functions ──
const {
    getAllProducts,
    getSingleProduct,
    createProduct,
    updateProduct,
    deleteProduct,
} = require('../controllers/productController');

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ROUTES — No authentication required
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/products
 * @desc    Get all products (with optional query string filters)
 * @access  Public
 * @example GET /api/products?category=64abc&isAvailable=true
 */
router.get('/', getAllProducts);

/**
 * @route   GET /api/products/:id
 * @desc    Get full details of a single product
 * @access  Public
 */
router.get('/:id', getSingleProduct);

// ─────────────────────────────────────────────────────────────────────────────
// PROTECTED ROUTES — Login + Admin/Manager role required
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/products
 * @desc    Add a new product to the menu
 * @access  Private (Admin/Manager)
 */
router.post('/', protect, adminOnly, createProduct);

/**
 * @route   POST /api/products/upload-image
 * @desc    Upload product image
 * @access  Private (Admin/Manager)
 */
router.post('/upload-image', protect, adminOnly, upload.single('image'), (req, res) => {
    if (req.file) {
        res.status(200).json({ success: true, url: req.file.path });
    } else {
        res.status(400).json({ success: false, message: 'Image upload failed' });
    }
});

/**
 * @route   PUT /api/products/:id
 * @desc    Update product details (name, price, stock, availability, etc.)
 * @access  Private (Admin/Manager)
 */
router.put('/:id', protect, adminOnly, updateProduct);

/**
 * @route   DELETE /api/products/:id
 * @desc    Permanently remove a product
 * @access  Private (Admin/Manager)
 */
router.delete('/:id', protect, adminOnly, deleteProduct);

module.exports = router;

/*
 * END OF FILE SUMMARY
 * =====================
 * File:    routes/productRoutes.js
 * Mounted: /api/products (server.js)
 *
 * Route    Method   Middleware           Controller
 * ────────────────────────────────────────────────────
 * /        GET      none                 getAllProducts
 * /:id     GET      none                 getSingleProduct
 * /        POST     protect, adminOnly   createProduct
 * /:id     PUT      protect, adminOnly   updateProduct
 * /:id     DELETE   protect, adminOnly   deleteProduct
 */
