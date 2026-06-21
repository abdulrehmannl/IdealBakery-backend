/**
 * routes/attendanceRoutes.js — Attendance API Routes
 * ====================================================
 * Mounted: app.use('/api/attendance', attendanceRoutes)
 * Access: staffOrAdmin — both staff and admin can mark & view attendance.
 *   DELETE is admin-only (only admin can erase records).
 *
 *   GET    /api/attendance        → getAllAttendance  (?staff ?status ?dateFrom ?dateTo)
 *   GET    /api/attendance/:id    → getSingleAttendance
 *   POST   /api/attendance        → markAttendance
 *   PUT    /api/attendance/:id    → updateAttendance
 *   DELETE /api/attendance/:id    → deleteAttendance   (admin only)
 */

const express = require('express');
const router  = express.Router();
const { protect, adminOnly, staffOrAdmin } = require('../middleware/auth');
const { getAllAttendance, getSingleAttendance, markAttendance, updateAttendance, deleteAttendance, getMyAttendance } = require('../controllers/attendanceController');

router.get('/',       protect, staffOrAdmin, getAllAttendance);
router.get('/my-attendance', protect, getMyAttendance);
router.get('/:id',    protect, staffOrAdmin, getSingleAttendance);
router.post('/',      protect, staffOrAdmin, markAttendance);
router.put('/:id',    protect, staffOrAdmin, updateAttendance);
router.delete('/:id', protect, adminOnly,    deleteAttendance);

module.exports = router;
/* END — File: routes/attendanceRoutes.js  Mounted: /api/attendance */
