/**
 * controllers/productController.js — Product Business Logic
 * ===========================================================
 * Handles all CRUD operations for bakery products.
 *
 * PRODUCT SCHEMA RECAP (from models/Product.js):
 * ────────────────────────────────────────────────
 *   name         String   required
 *   description  String   optional
 *   price        Number   required
 *   discount     Number   default: 0        → percentage discount (0-100)
 *   weight       String   optional          → e.g. "500g", "1kg"
 *   stock        Number   default: 0
 *   tags         [String] optional          → e.g. ["bestseller", "sugarfree"]
 *   isAvailable  Boolean  default: true
 *   isSugarFree  Boolean  default: false
 *   image        String   optional          → URL/path to image
 *   category     ObjectId ref:'Category'  required  → FK to Category
 *   branch       [ObjectId] ref:'Branch'  min 1     → array of branch IDs
 *   timestamps   createdAt, updatedAt (auto)
 *
 * KEY FEATURES:
 * ─────────────
 * 1. .populate() — replaces category/branch ObjectIds with full documents
 * 2. URL Query Filters — ?category=id&branch=id&isAvailable=true&tags=bestseller
 * 3. Partial Update — only updates fields that are sent in the request
 */

const Product = require('../models/Product');
// Import the Mongoose model for the 'products' collection.

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 1: getAllProducts
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Get all products with optional query filters
 * @route   GET /api/products
 * @access  Public — menu page needs this without login
 *
 * SUPPORTED QUERY PARAMETERS:
 * ────────────────────────────
 *   ?category=<categoryId>    → filter by category (e.g. Fast Food)
 *   ?branch=<branchId>        → filter by branch
 *   ?isAvailable=true         → only show available products
 *   ?tags=bestseller          → filter by a specific tag
 *
 * EXAMPLE URLS:
 *   GET /api/products                          → all products
 *   GET /api/products?isAvailable=true         → only available ones
 *   GET /api/products?category=64abc&branch=64def → fast food at branch 1
 *   GET /api/products?tags=bestseller          → bestselling products
 */
const getAllProducts = async (req, res, next) => {
    try {
        // ── Build a dynamic filter object from query params ──
        // We start with an empty filter (gets ALL products)
        // and add conditions based on what the client sends.
        const filter = {};

        // Filter by category ObjectId or Name
        if (req.query.category) {
            if (req.query.category.match(/^[0-9a-fA-F]{24}$/)) {
                filter.category = req.query.category;
            } else {
                const Category = require('../models/Category');
                const cat = await Category.findOne({ name: { $regex: new RegExp(`^${req.query.category}$`, 'i') } });
                if (cat) filter.category = cat._id;
                else filter.category = null; // force empty result if category name not found
            }
        }

        // Filter by branch ObjectId
        // Since branch is an ARRAY on the product, we use $in to check
        // if the given branch ID exists anywhere in that array.
        if (req.query.branch) {
            filter.branch = { $in: [req.query.branch] };
            // $in: match documents where 'branch' array contains this value
        }

        // Filter by availability
        if (req.query.isAvailable !== undefined) {
            filter.isAvailable = req.query.isAvailable === 'true';
            // Convert string "true"/"false" → actual Boolean
        }

        // Filter by tags
        // Product.tags is an array, so we use $in to check if the tag exists
        if (req.query.tags) {
            filter.tags = { $in: [req.query.tags] };
            // Matches products where tags array contains the given value
            // e.g. tags: ["bestseller", "featured"] matches ?tags=bestseller
        }

        // ── Execute the query with populate ──
        // populate('category', 'name') → replace category ObjectId with { _id, name }
        // populate('branch',   'name city') → replace branch ObjectIds with { _id, name, city }
        const products = await Product.find(filter)
            .populate('category', 'name description')
            .populate('branch',   'name city address')
            .sort({ createdAt: -1 }) // newest first
            .limit(100);             // cap results to prevent overloading the server

        return res.status(200).json({
            success: true,
            count:   products.length,
            data:    products,
        });

    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 2: getSingleProduct
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Get a single product by its MongoDB _id
 * @route   GET /api/products/:id
 * @access  Public — product detail page needs this without login
 */
const getSingleProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('category', 'name description')
            .populate('branch',   'name city address phone');
        // We populate more branch fields here since it's a detail page

        if (!product) {
            return res.status(404).json({
                success: false,
                message: `No product found with ID: ${req.params.id}`,
            });
        }

        return res.status(200).json({
            success: true,
            data: product,
        });

    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 3: createProduct
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Create a new product
 * @route   POST /api/products
 * @access  Private — Admin/Manager only
 *
 * Request Body (JSON):
 *   {
 *     "name":        "Black Forest Cake",
 *     "description": "Rich chocolate cake with cherries",
 *     "price":       1800,
 *     "discount":    10,
 *     "weight":      "1kg",
 *     "stock":       20,
 *     "tags":        ["bestseller", "cake"],
 *     "isAvailable": true,
 *     "isSugarFree": false,
 *     "image":       "https://example.com/cake.jpg",
 *     "category":    "64abc123",                    ← required: Category ObjectId
 *     "branch":      ["64def456", "64ghi789"]       ← required: array of Branch ObjectIds
 *   }
 */
const createProduct = async (req, res, next) => {
    try {
        const {
            name, description, price, discount, weight,
            stock, tags, isAvailable, isSugarFree, image,
            category, branch
        } = req.body;

        // ── Step 1: Validate required fields ──
        const missingFields = [];
        if (!name)     missingFields.push('name');
        if (!price)    missingFields.push('price');
        if (!category) missingFields.push('category');
        if (!branch || !Array.isArray(branch) || branch.length === 0) {
            missingFields.push('branch (must be an array with at least 1 branch ID)');
        }

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`,
            });
        }

        // ── Step 2: Validate price is a positive number ──
        if (typeof price !== 'number' || price <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Price must be a positive number.',
            });
        }

        // ── Step 3: Create the product in MongoDB ──
        const product = await Product.create({
            name:        name.trim(),
            description: description ? description.trim() : undefined,
            price,
            discount:    discount    || 0,
            weight:      weight      ? weight.trim() : undefined,
            stock:       stock       || 0,
            tags:        tags        || [],
            isAvailable: isAvailable !== undefined ? isAvailable : true,
            isSugarFree: isSugarFree || false,
            image:       image       ? image.trim() : undefined,
            category,
            branch,
        });

        // ── Step 4: Return with populated references ──
        const populated = await Product.findById(product._id)
            .populate('category', 'name')
            .populate('branch',   'name city');

        return res.status(201).json({
            success: true,
            message: `Product "${product.name}" created successfully.`,
            data:    populated,
        });

    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 4: updateProduct
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Update an existing product (partial update supported)
 * @route   PUT /api/products/:id
 * @access  Private — Admin/Manager only
 */
const updateProduct = async (req, res, next) => {
    try {
        const {
            name, description, price, discount, weight,
            stock, tags, isAvailable, isSugarFree, image,
            category, branch
        } = req.body;

        // ── Build update object — only include fields that were sent ──
        const updateData = {};
        if (name        !== undefined) updateData.name        = name.trim();
        if (description !== undefined) updateData.description = description.trim();
        if (price       !== undefined) updateData.price       = price;
        if (discount    !== undefined) updateData.discount    = discount;
        if (weight      !== undefined) updateData.weight      = weight.trim();
        if (stock       !== undefined) updateData.stock       = stock;
        if (tags        !== undefined) updateData.tags        = tags;
        if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
        if (isSugarFree !== undefined) updateData.isSugarFree = isSugarFree;
        if (image       !== undefined) updateData.image       = image.trim();
        if (category    !== undefined) updateData.category    = category;
        if (branch      !== undefined) updateData.branch      = branch;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields provided to update.',
            });
        }

        // ── Find and update in one DB call ──
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        )
            .populate('category', 'name description')
            .populate('branch',   'name city');

        if (!product) {
            return res.status(404).json({
                success: false,
                message: `No product found with ID: ${req.params.id}`,
            });
        }

        return res.status(200).json({
            success: true,
            message: `Product "${product.name}" updated successfully.`,
            data:    product,
        });

    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 5: deleteProduct
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Delete a product permanently
 * @route   DELETE /api/products/:id
 * @access  Private — Admin/Manager only
 */
const deleteProduct = async (req, res, next) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: `No product found with ID: ${req.params.id}`,
            });
        }

        return res.status(200).json({
            success: true,
            message: `Product "${product.name}" deleted successfully.`,
            data:    null,
        });

    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
    getAllProducts,
    getSingleProduct,
    createProduct,
    updateProduct,
    deleteProduct,
};

/*
 * END OF FILE SUMMARY
 * =====================
 * File:    controllers/productController.js
 * Exports: { getAllProducts, getSingleProduct, createProduct,
 *             updateProduct, deleteProduct }
 *
 * Function           HTTP     Route                Access
 * ─────────────────────────────────────────────────────────
 * getAllProducts      GET      /api/products        Public
 *   Filters:  ?category=id  ?branch=id  ?isAvailable=true  ?tags=bestseller
 * getSingleProduct   GET      /api/products/:id    Public
 * createProduct      POST     /api/products        Admin/Manager
 * updateProduct      PUT      /api/products/:id    Admin/Manager
 * deleteProduct      DELETE   /api/products/:id    Admin/Manager
 *
 * Populate fields:
 *   category → name, description
 *   branch   → name, city, address (+ phone on single product)
 *
 * MongoDB operators used:
 *   $in        → check if value exists in an array field
 *   $regex     → pattern matching (duplicate name check)
 */
