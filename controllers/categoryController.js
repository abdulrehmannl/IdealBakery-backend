/**
 * controllers/categoryController.js — Category Business Logic
 * =============================================================
 * Handles all CRUD operations for product categories.
 *
 * CATEGORY SCHEMA RECAP (from models/Category.js):
 * ──────────────────────────────────────────────────
 *   name           String  required  → e.g. "Fast Food", "Bakery Items"
 *   description    String  optional  → short description of the category
 *   isActive       Boolean default:true
 *   parentCategory ObjectId ref:'Category' default:null
 *                  → allows sub-categories. e.g. "Cakes" → parent: "Bakery Items"
 *   timestamps     createdAt, updatedAt (auto)
 *
 * WHAT IS .populate()?
 * ─────────────────────
 * MongoDB stores references as ObjectIds (just an ID like "64abc123...").
 * .populate('parentCategory') tells Mongoose to REPLACE that ObjectId with the
 * actual Category document from the database — so instead of just the ID,
 * we get the full { name, description, ... } object.
 * This is called "joining" in SQL world.
 */

const Category = require('../models/Category');
// Import the Mongoose model to query the 'categories' collection in MongoDB.

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 1: getAllCategories
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Get all categories
 * @route   GET /api/categories
 * @access  Public — anyone can view categories (needed for the menu page)
 */
const getAllCategories = async (req, res, next) => {
    try {
        // ── Find every category document in MongoDB ──
        // Category.find({}) = find where conditions = {} (no filter = get ALL)
        // .populate('parentCategory') = replace parentCategory ObjectId with
        //   the actual parent Category document (name, description, etc.)
        //   select only 'name' from parent to keep response lean
        const categories = await Category.find({})
            .populate('parentCategory', 'name');
        // e.g. instead of: { parentCategory: "64abc123" }
        // we get:          { parentCategory: { _id: "64abc123", name: "Bakery" } }

        return res.status(200).json({
            success: true,
            count: categories.length,   // useful for the frontend to know total
            data: categories,
        });

    } catch (error) {
        // Pass any unexpected error to the global error handler (middleware/errorHandler.js)
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 2: getSingleCategory
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Get a single category by its MongoDB _id
 * @route   GET /api/categories/:id
 * @access  Public
 *
 * HOW :id WORKS:
 * ──────────────
 * When the route is /api/categories/:id, Express captures whatever the client
 * puts after /api/categories/ and puts it in req.params.id.
 * Example: GET /api/categories/64abc123 → req.params.id = "64abc123"
 */
const getSingleCategory = async (req, res, next) => {
    try {
        // req.params.id = the ID from the URL (e.g. "64abc123def456")
        const category = await Category.findById(req.params.id)
            .populate('parentCategory', 'name');

        // ── Handle: category not found ──
        if (!category) {
            return res.status(404).json({
                success: false,
                message: `No category found with ID: ${req.params.id}`,
                // 404 = Not Found — the resource doesn't exist in the database
            });
        }

        return res.status(200).json({
            success: true,
            data: category,
        });

    } catch (error) {
        next(error);
        // Note: If req.params.id is not a valid MongoDB ObjectId format,
        // Mongoose throws a CastError which our errorHandler converts to:
        // { success: false, message: "Invalid ID format: ..." }
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 3: createCategory
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Create a new category
 * @route   POST /api/categories
 * @access  Private — Admin/Manager only (protected by middleware in routes file)
 *
 * Request Body (JSON):
 *   {
 *     "name": "Fast Food",
 *     "description": "Burgers, fries, and more",
 *     "parentCategory": "64abc123"    ← optional
 *   }
 */
const createCategory = async (req, res, next) => {
    try {
        const { name, description, parentCategory } = req.body;

        // ── Step 1: Validate required fields ──
        if (!name || name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Category name is required.',
            });
        }

        // ── Step 2: Check for duplicate name ──
        // We don't want two categories with the exact same name (case-insensitive).
        // Regex: /^Fast Food$/i → matches "Fast Food", "fast food", "FAST FOOD" etc.
        const existingCategory = await Category.findOne({
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
            // $regex: MongoDB operator for pattern matching
            // 'i' flag: case-insensitive search
        });

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: `A category named "${name.trim()}" already exists.`,
            });
        }

        // ── Step 3: Build the category object ──
        const categoryData = {
            name:        name.trim(),
            description: description ? description.trim() : undefined,
            // Only set parentCategory if it was actually provided
            parentCategory: parentCategory || null,
        };

        // ── Step 4: Save to MongoDB ──
        // Category.create() is shorthand for: new Category(data).save()
        const category = await Category.create(categoryData);

        // ── Step 5: Populate and return ──
        // Re-fetch so parentCategory is populated in the response
        const populated = await Category.findById(category._id)
            .populate('parentCategory', 'name');

        return res.status(201).json({
            // 201 = Created — standard code when a new resource is created
            success: true,
            message: `Category "${category.name}" created successfully.`,
            data: populated,
        });

    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 4: updateCategory
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Update an existing category
 * @route   PUT /api/categories/:id
 * @access  Private — Admin/Manager only
 *
 * HOW PARTIAL UPDATES WORK:
 * ──────────────────────────
 * We use findByIdAndUpdate() with { new: true, runValidators: true }
 * The client only sends the fields they want to change — unchanged fields stay.
 * Example: Send { description: "New description" } → only description updates.
 */
const updateCategory = async (req, res, next) => {
    try {
        const { name, description, isActive, parentCategory } = req.body;

        // ── Build update object — only include fields that were sent ──
        // This prevents accidentally overwriting fields with undefined
        const updateData = {};
        if (name        !== undefined) updateData.name        = name.trim();
        if (description !== undefined) updateData.description = description.trim();
        if (isActive    !== undefined) updateData.isActive    = isActive;
        if (parentCategory !== undefined) updateData.parentCategory = parentCategory || null;

        // ── Check if there's anything to update ──
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields provided to update.',
            });
        }

        // ── Find the category by ID and update it ──
        const category = await Category.findByIdAndUpdate(
            req.params.id,
            updateData,
            {
                new:            true,  // return the UPDATED document (not the old one)
                runValidators:  true,  // run schema validation on updated fields
            }
        ).populate('parentCategory', 'name');

        if (!category) {
            return res.status(404).json({
                success: false,
                message: `No category found with ID: ${req.params.id}`,
            });
        }

        return res.status(200).json({
            success: true,
            message: `Category "${category.name}" updated successfully.`,
            data: category,
        });

    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 5: deleteCategory
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Delete a category by ID
 * @route   DELETE /api/categories/:id
 * @access  Private — Admin/Manager only
 *
 * NOTE: In a production app you'd also check if any Products reference this
 * category before deleting, to avoid orphaned references. We'll add that
 * when the Products API is integrated.
 */
const deleteCategory = async (req, res, next) => {
    try {
        // findByIdAndDelete() finds the document AND removes it in one operation
        const category = await Category.findByIdAndDelete(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: `No category found with ID: ${req.params.id}`,
            });
        }

        return res.status(200).json({
            success: true,
            message: `Category "${category.name}" deleted successfully.`,
            data: null,
        });

    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
    getAllCategories,
    getSingleCategory,
    createCategory,
    updateCategory,
    deleteCategory,
};

/*
 * END OF FILE SUMMARY
 * =====================
 * File:    controllers/categoryController.js
 * Exports: { getAllCategories, getSingleCategory, createCategory,
 *             updateCategory, deleteCategory }
 *
 * Function           HTTP     Route                    Access
 * ─────────────────────────────────────────────────────────────
 * getAllCategories    GET      /api/categories          Public
 * getSingleCategory  GET      /api/categories/:id      Public
 * createCategory     POST     /api/categories          Admin/Manager
 * updateCategory     PUT      /api/categories/:id      Admin/Manager
 * deleteCategory     DELETE   /api/categories/:id      Admin/Manager
 *
 * Key techniques used:
 *   .populate()          → replaces ObjectId with full document
 *   $regex case-insensitive → duplicate name check
 *   findByIdAndUpdate()  → atomic find + update in one DB call
 *   Partial updates      → only update fields that were sent
 */
