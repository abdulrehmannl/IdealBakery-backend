/**
 * controllers/branchController.js — Branch Business Logic
 * =========================================================
 * Handles all CRUD operations for bakery branches.
 *
 * BRANCH SCHEMA RECAP (from models/Branch.js):
 * ──────────────────────────────────────────────
 *   name         String  required  → e.g. "Branch 1 - Blue Area"
 *   address      String  required  → full street address
 *   city         String  required  → e.g. "Islamabad"
 *   phone        String  required  → contact number for the branch
 *   managerName  String  optional  → name of the branch manager
 *   isActive     Boolean default:true → false = branch is closed
 *   timestamps   createdAt, updatedAt (auto-managed by Mongoose)
 *
 * WHY BRANCHES MATTER:
 * ─────────────────────
 * Every product, staff member, and counter sale is linked to a branch.
 * Branches are essentially the root entity many other things depend on.
 * That's why we build this API early — before products and staff.
 */

const Branch = require('../models/Branch');
// Import the Mongoose model to query the 'branches' collection in MongoDB.

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 1: getAllBranches
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Get all branches
 * @route   GET /api/branches
 * @access  Public — homepage shows branch locations, no login needed
 */
const getAllBranches = async (req, res, next) => {
    try {
        // ── Optional filter: ?isActive=true ──
        // Allows the homepage to only fetch active (open) branches.
        // req.query holds URL query parameters: /api/branches?isActive=true
        const filter = {};
        if (req.query.isActive !== undefined) {
            // Convert string "true"/"false" to actual Boolean
            filter.isActive = req.query.isActive === 'true';
        }

        // Fetch all branches sorted by creation date (newest first)
        const branches = await Branch.find(filter).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count:   branches.length,
            data: branches,
        });

    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 2: getSingleBranch
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Get a single branch by ID
 * @route   GET /api/branches/:id
 * @access  Public
 */
const getSingleBranch = async (req, res, next) => {
    try {
        const branch = await Branch.findById(req.params.id);

        if (!branch) {
            return res.status(404).json({
                success: false,
                message: `No branch found with ID: ${req.params.id}`,
            });
        }

        return res.status(200).json({
            success: true,
            data: branch,
        });

    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 3: createBranch
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Create a new branch
 * @route   POST /api/branches
 * @access  Private — Admin/Manager only
 *
 * Request Body (JSON):
 *   {
 *     "name":        "Branch 3 - F-11",
 *     "address":     "F-11 Markaz, Islamabad",
 *     "city":        "Islamabad",
 *     "phone":       "051-1234567",
 *     "managerName": "Usman Khan"     ← optional
 *   }
 */
const createBranch = async (req, res, next) => {
    try {
        const { name, address, city, phone, managerName } = req.body;

        // ── Step 1: Validate all required fields ──
        const missingFields = [];
        if (!name)    missingFields.push('name');
        if (!address) missingFields.push('address');
        if (!city)    missingFields.push('city');
        if (!phone)   missingFields.push('phone');

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`,
            });
        }

        // ── Step 2: Check for duplicate branch name ──
        // Prevent creating two branches with the same name
        const existingBranch = await Branch.findOne({
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        });

        if (existingBranch) {
            return res.status(400).json({
                success: false,
                message: `A branch named "${name.trim()}" already exists.`,
            });
        }

        // ── Step 3: Create the branch in MongoDB ──
        const branch = await Branch.create({
            name:        name.trim(),
            address:     address.trim(),
            city:        city.trim(),
            phone:       phone.trim(),
            managerName: managerName ? managerName.trim() : undefined,
        });

        return res.status(201).json({
            success: true,
            message: `Branch "${branch.name}" created successfully.`,
            data:    branch,
        });

    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 4: updateBranch
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Update an existing branch
 * @route   PUT /api/branches/:id
 * @access  Private — Admin/Manager only
 */
const updateBranch = async (req, res, next) => {
    try {
        const { name, address, city, phone, managerName, isActive } = req.body;

        // ── Build update object — only fields that were actually sent ──
        const updateData = {};
        if (name        !== undefined) updateData.name        = name.trim();
        if (address     !== undefined) updateData.address     = address.trim();
        if (city        !== undefined) updateData.city        = city.trim();
        if (phone       !== undefined) updateData.phone       = phone.trim();
        if (managerName !== undefined) updateData.managerName = managerName.trim();
        if (isActive    !== undefined) updateData.isActive    = isActive;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields provided to update.',
            });
        }

        const branch = await Branch.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!branch) {
            return res.status(404).json({
                success: false,
                message: `No branch found with ID: ${req.params.id}`,
            });
        }

        return res.status(200).json({
            success: true,
            message: `Branch "${branch.name}" updated successfully.`,
            data:    branch,
        });

    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 5: deleteBranch
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc    Delete a branch by ID
 * @route   DELETE /api/branches/:id
 * @access  Private — Admin/Manager only
 *
 * NOTE: In production you'd want to check if any Staff or Products reference
 * this branch before deleting, to avoid orphaned data. This will be addressed
 * once the full API suite is built.
 */
const deleteBranch = async (req, res, next) => {
    try {
        const branch = await Branch.findByIdAndDelete(req.params.id);

        if (!branch) {
            return res.status(404).json({
                success: false,
                message: `No branch found with ID: ${req.params.id}`,
            });
        }

        return res.status(200).json({
            success: true,
            message: `Branch "${branch.name}" deleted successfully.`,
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
    getAllBranches,
    getSingleBranch,
    createBranch,
    updateBranch,
    deleteBranch,
};

/*
 * END OF FILE SUMMARY
 * =====================
 * File:    controllers/branchController.js
 * Exports: { getAllBranches, getSingleBranch, createBranch,
 *             updateBranch, deleteBranch }
 *
 * Function          HTTP     Route               Access
 * ──────────────────────────────────────────────────────
 * getAllBranches     GET      /api/branches       Public
 *                            supports ?isActive=true filter
 * getSingleBranch   GET      /api/branches/:id   Public
 * createBranch      POST     /api/branches       Admin/Manager
 * updateBranch      PUT      /api/branches/:id   Admin/Manager
 * deleteBranch      DELETE   /api/branches/:id   Admin/Manager
 *
 * Validations:
 *   createBranch: name, address, city, phone all required
 *   Duplicate branch name check (case-insensitive)
 *   Partial update: only updates fields that are sent
 */
