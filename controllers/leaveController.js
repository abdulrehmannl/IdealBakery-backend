/**
 * controllers/leaveController.js — Staff Leave Business Logic
 * ============================================================
 * STAFFLEAVE SCHEMA RECAP:
 *   staff       ObjectId ref:Staff  required
 *   leaveType   enum: sick|casual|emergency|unpaid  required
 *   startDate   Date  required
 *   endDate     Date  required
 *   reason      String  required
 *   status      enum: pending|approved|rejected  default:pending
 *   approvedBy  ObjectId ref:Staff  optional (who approved/rejected)
 *
 * WORKFLOW:
 *   1. Staff submits leave → status: pending
 *   2. Manager approves/rejects → status: approved|rejected, approvedBy: managerId
 */

const StaffLeave = require('../models/StaffLeave');

// GET all leave requests — Admin/Manager
// Filters: ?staff=id  ?status=pending  ?leaveType=sick
const getAllLeaves = async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.staff)     filter.staff     = req.query.staff;
        if (req.query.status)    filter.status    = req.query.status;
        if (req.query.leaveType) filter.leaveType = req.query.leaveType;

        const leaves = await StaffLeave.find(filter)
            .populate('staff',      'name role phone')
            .populate('approvedBy', 'name role')
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, count: leaves.length, data: leaves });
    } catch (error) { next(error); }
};

// GET single leave request
const getSingleLeave = async (req, res, next) => {
    try {
        const leave = await StaffLeave.findById(req.params.id)
            .populate('staff', 'name role').populate('approvedBy', 'name');
        if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found.' });
        return res.status(200).json({ success: true, data: leave });
    } catch (error) { next(error); }
};

// POST create a leave request
const createLeave = async (req, res, next) => {
    try {
        const { staff, leaveType, startDate, endDate, reason } = req.body;

        const missing = [];
        if (!staff)     missing.push('staff');
        if (!leaveType) missing.push('leaveType');
        if (!startDate) missing.push('startDate');
        if (!endDate)   missing.push('endDate');
        if (!reason)    missing.push('reason');
        if (missing.length > 0)
            return res.status(400).json({ success: false, message: `Missing: ${missing.join(', ')}` });

        // Validate dates: endDate must be >= startDate
        if (new Date(endDate) < new Date(startDate))
            return res.status(400).json({ success: false, message: 'endDate must be on or after startDate.' });

        const leave = await StaffLeave.create({ staff, leaveType, startDate, endDate, reason });
        const populated = await StaffLeave.findById(leave._id).populate('staff', 'name role');
        return res.status(201).json({ success: true, message: 'Leave request submitted.', data: populated });
    } catch (error) { next(error); }
};

// PUT approve or reject a leave request
const updateLeaveStatus = async (req, res, next) => {
    try {
        const { status, approvedBy } = req.body;
        const allowed = ['pending', 'approved', 'rejected'];

        if (!status || !allowed.includes(status))
            return res.status(400).json({ success: false, message: `Status must be one of: ${allowed.join(', ')}` });

        const updateData = { status };
        if (approvedBy) updateData.approvedBy = approvedBy;

        const leave = await StaffLeave.findByIdAndUpdate(req.params.id, updateData, { new: true })
            .populate('staff', 'name role').populate('approvedBy', 'name');

        if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found.' });
        return res.status(200).json({ success: true, message: `Leave ${status}.`, data: leave });
    } catch (error) { next(error); }
};

// DELETE leave request
const deleteLeave = async (req, res, next) => {
    try {
        const leave = await StaffLeave.findByIdAndDelete(req.params.id);
        if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found.' });
        return res.status(200).json({ success: true, message: 'Leave request deleted.', data: null });
    } catch (error) { next(error); }
};

module.exports = { getAllLeaves, getSingleLeave, createLeave, updateLeaveStatus, deleteLeave };

/*
 * END OF FILE SUMMARY
 * File: controllers/leaveController.js
 * GET    /api/leaves       → getAllLeaves   (?staff ?status ?leaveType)
 * GET    /api/leaves/:id   → getSingleLeave
 * POST   /api/leaves       → createLeave   (validates endDate >= startDate)
 * PUT    /api/leaves/:id   → updateLeaveStatus (approve/reject)
 * DELETE /api/leaves/:id   → deleteLeave
 */
