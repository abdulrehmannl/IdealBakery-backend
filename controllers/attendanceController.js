/**
 * controllers/attendanceController.js — Attendance Business Logic
 * ================================================================
 * ATTENDANCE SCHEMA RECAP:
 *   staff       ObjectId ref:Staff  required
 *   date        Date  default:now
 *   status      enum: present|absent|late|halfday  required
 *   arrivalTime String  optional   e.g. "09:15"
 *   leaveTime   String  optional   e.g. "17:30"
 *   notes       String  optional
 *   Unique index: { staff + date } — one record per staff per day
 */

const Attendance = require('../models/Attendance');
const User = require('../models/User');

// GET all attendance records
// Filters: ?staff=id  ?date=2026-04-09  ?status=absent  ?branch (via staff populate)
const getAllAttendance = async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.staff)  filter.staff  = req.query.staff;
        if (req.query.status) filter.status = req.query.status;

        // If manager, enforce branch filtering
        if (req.user && req.user.role === 'manager') {
            const branchStaff = await User.find({ branch: req.user.branch }).select('_id');
            const staffIds = branchStaff.map(s => s._id);
            filter.staff = { $in: staffIds };
        }

        // Date range filter — ?dateFrom=2026-04-01&dateTo=2026-04-30
        if (req.query.dateFrom || req.query.dateTo) {
            filter.date = {};
            if (req.query.dateFrom) filter.date.$gte = new Date(req.query.dateFrom);
            if (req.query.dateTo)   filter.date.$lte = new Date(req.query.dateTo);
            // $gte = greater than or equal (from date)
            // $lte = less than or equal    (to date)
        }

        const records = await Attendance.find(filter)
            .populate({ path: 'staff', select: 'name role', populate: { path: 'branch', select: 'name' } })
            .sort({ date: -1 });

        return res.status(200).json({ success: true, count: records.length, data: records });
    } catch (error) { next(error); }
};

// GET single attendance record
const getSingleAttendance = async (req, res, next) => {
    try {
        const record = await Attendance.findById(req.params.id)
            .populate('staff', 'name role phone');
        if (!record) return res.status(404).json({ success: false, message: 'Attendance record not found.' });
        return res.status(200).json({ success: true, data: record });
    } catch (error) { next(error); }
};

// POST mark attendance for a staff member (or bulk)
const markAttendance = async (req, res, next) => {
    try {
        if (req.body.records && Array.isArray(req.body.records)) {
            const { date, records } = req.body;
            const attendanceDate = date ? new Date(date) : new Date();
            attendanceDate.setHours(0, 0, 0, 0);

            const ops = records.map(r => ({
                updateOne: {
                    filter: { staff: r.staffId, date: attendanceDate },
                    update: { $set: { status: r.status, arrivalTime: r.arrivalTime, leaveTime: r.leaveTime, markedBy: req.user._id } },
                    upsert: true
                }
            }));
            await Attendance.bulkWrite(ops);
            return res.status(200).json({ success: true, message: 'Attendance marked for all.' });
        }

        const { staff, date, status, arrivalTime, leaveTime, notes } = req.body;

        if (!staff || !status)
            return res.status(400).json({ success: false, message: 'staff and status are required.' });

        // Use provided date or today
        const attendanceDate = date ? new Date(date) : new Date();
        // Normalize to midnight so the unique index works correctly
        attendanceDate.setHours(0, 0, 0, 0);

        const record = await Attendance.create({ staff, date: attendanceDate, status, arrivalTime, leaveTime, notes, markedBy: req.user._id });
        const populated = await Attendance.findById(record._id).populate('staff', 'name role');

        return res.status(201).json({ success: true, message: 'Attendance marked.', data: populated });
    } catch (error) { next(error); }
};

// PUT update an attendance record
const updateAttendance = async (req, res, next) => {
    try {
        const { status, arrivalTime, leaveTime, notes } = req.body;
        const updateData = {};
        if (status      !== undefined) updateData.status      = status;
        if (arrivalTime !== undefined) updateData.arrivalTime = arrivalTime;
        if (leaveTime   !== undefined) updateData.leaveTime   = leaveTime;
        if (notes       !== undefined) updateData.notes       = notes;

        const record = await Attendance.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
            .populate('staff', 'name role');

        if (!record) return res.status(404).json({ success: false, message: 'Attendance record not found.' });
        return res.status(200).json({ success: true, message: 'Attendance updated.', data: record });
    } catch (error) { next(error); }
};

// GET logged in user's attendance
const getMyAttendance = async (req, res, next) => {
    try {
        const records = await Attendance.find({ staff: req.user._id })
            .populate('markedBy', 'name')
            .sort({ date: -1 });

        // Calculate current month summary
        const now = new Date();
        const currentMonthRecords = records.filter(r => 
            r.date.getMonth() === now.getMonth() && r.date.getFullYear() === now.getFullYear()
        );
        
        const summary = {
            present: currentMonthRecords.filter(r => r.status === 'present').length,
            late: currentMonthRecords.filter(r => r.status === 'late').length,
            absent: currentMonthRecords.filter(r => r.status === 'absent').length,
            halfday: currentMonthRecords.filter(r => r.status === 'halfday').length
        };

        return res.status(200).json({ success: true, summary, data: records });
    } catch (error) { next(error); }
};

// DELETE an attendance record
const deleteAttendance = async (req, res, next) => {
    try {
        const record = await Attendance.findByIdAndDelete(req.params.id);
        if (!record) return res.status(404).json({ success: false, message: 'Attendance record not found.' });
        return res.status(200).json({ success: true, message: 'Attendance record deleted.', data: null });
    } catch (error) { next(error); }
};

module.exports = { getAllAttendance, getSingleAttendance, markAttendance, updateAttendance, deleteAttendance, getMyAttendance };

/*
 * END OF FILE SUMMARY
 * File: controllers/attendanceController.js
 * GET    /api/attendance       → getAllAttendance  (?staff ?status ?dateFrom ?dateTo)
 * GET    /api/attendance/:id   → getSingleAttendance
 * POST   /api/attendance       → markAttendance
 * PUT    /api/attendance/:id   → updateAttendance
 * DELETE /api/attendance/:id   → deleteAttendance
 * All Admin/Manager only.
 */
