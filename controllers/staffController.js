/**
 * controllers/staffController.js — Staff Business Logic
 * =======================================================
 * STAFF SCHEMA RECAP:
 *   name        String   required
 *   email       String   required unique
 *   phone       String   required
 *   role        enum: manager|staff|delivery  required
 *   salary      Number   required
 *   branch      ObjectId ref:Branch  required
 *   joiningDate Date     default:now
 *   isActive    Boolean  default:true
 *   address     String   optional
 *
 * Note: Staff are NOT User accounts — they are employee records.
 * A staff in the staff table is a real employee; a User with role:staff
 * is the login account for app access. They can be linked later if needed.
 */

const Staff = require('../models/Staff');

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 1: getAllStaff
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc  Get all staff members
 * @route GET /api/staff
 * @access Private — Admin/Manager
 * Filters: ?branch=id  ?role=staff  ?isActive=true
 */
const getAllStaff = async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.branch)   filter.branch   = req.query.branch;
        if (req.query.role)     filter.role      = req.query.role;
        if (req.query.isActive !== undefined)
            filter.isActive = req.query.isActive === 'true';

        const staff = await Staff.find(filter)
            .populate('branch', 'name city')
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, count: staff.length, data: staff });
    } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 2: getSingleStaff
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc  Get a single staff member
 * @route GET /api/staff/:id
 * @access Private — Admin/Manager
 */
const getSingleStaff = async (req, res, next) => {
    try {
        const staff = await Staff.findById(req.params.id)
            .populate('branch', 'name city address phone');
        if (!staff) return res.status(404).json({ success: false, message: 'Staff member not found.' });
        return res.status(200).json({ success: true, data: staff });
    } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 3: createStaff
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc  Register a new staff member
 * @route POST /api/staff
 * @access Private — Admin/Manager
 */
const createStaff = async (req, res, next) => {
    try {
        const { name, email, phone, role, salary, branch, joiningDate, address } = req.body;

        const missing = [];
        if (!name)   missing.push('name');
        if (!email)  missing.push('email');
        if (!phone)  missing.push('phone');
        if (!role)   missing.push('role');
        if (!salary) missing.push('salary');
        if (!branch) missing.push('branch');
        if (missing.length > 0)
            return res.status(400).json({ success: false, message: `Missing: ${missing.join(', ')}` });

        // Check duplicate email
        const exists = await Staff.findOne({ email: email.toLowerCase().trim() });
        if (exists)
            return res.status(400).json({ success: false, message: 'A staff member with this email already exists.' });

        const staff = await Staff.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            role,
            salary,
            branch,
            joiningDate: joiningDate || Date.now(),
            address: address ? address.trim() : undefined,
        });

        const populated = await Staff.findById(staff._id).populate('branch', 'name city');
        return res.status(201).json({ success: true, message: `Staff "${staff.name}" added.`, data: populated });

    } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 4: updateStaff
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc  Update staff member details
 * @route PUT /api/staff/:id
 * @access Private — Admin/Manager
 */
const updateStaff = async (req, res, next) => {
    try {
        const { name, email, phone, role, salary, branch, isActive, address } = req.body;

        const updateData = {};
        if (name     !== undefined) updateData.name     = name.trim();
        if (email    !== undefined) updateData.email    = email.toLowerCase().trim();
        if (phone    !== undefined) updateData.phone    = phone.trim();
        if (role     !== undefined) updateData.role     = role;
        if (salary   !== undefined) updateData.salary   = salary;
        if (branch   !== undefined) updateData.branch   = branch;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (address  !== undefined) updateData.address  = address.trim();

        if (Object.keys(updateData).length === 0)
            return res.status(400).json({ success: false, message: 'No fields to update.' });

        const staff = await Staff.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
            .populate('branch', 'name city');

        if (!staff) return res.status(404).json({ success: false, message: 'Staff member not found.' });
        return res.status(200).json({ success: true, message: `Staff "${staff.name}" updated.`, data: staff });

    } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER 5: deleteStaff
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @desc  Delete a staff member record
 * @route DELETE /api/staff/:id
 * @access Private — Admin/Manager
 */
const deleteStaff = async (req, res, next) => {
    try {
        const staff = await Staff.findByIdAndDelete(req.params.id);
        if (!staff) return res.status(404).json({ success: false, message: 'Staff member not found.' });
        return res.status(200).json({ success: true, message: `Staff "${staff.name}" deleted.`, data: null });
    } catch (error) { next(error); }
};

module.exports = { getAllStaff, getSingleStaff, createStaff, updateStaff, deleteStaff };

/*
 * END OF FILE SUMMARY
 * =====================
 * File: controllers/staffController.js
 * All routes: Admin/Manager only
 * GET /api/staff           → getAllStaff   (filters: ?branch ?role ?isActive)
 * GET /api/staff/:id       → getSingleStaff
 * POST /api/staff          → createStaff  (validates: name,email,phone,role,salary,branch)
 * PUT /api/staff/:id       → updateStaff  (partial update)
 * DELETE /api/staff/:id    → deleteStaff
 */
