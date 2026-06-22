/**
 * routes/leaveRoutes.js — Staff Leave API Routes
 * ================================================
 * Mounted: app.use('/api/leaves', leaveRoutes)
 * Access: staffOrAdmin — staff can apply and view their own leaves.
 *   PUT (approve/reject) and DELETE are admin-only.
 *
 *   GET    /api/leaves        → getAllLeaves    (?staff ?status ?leaveType)
 *   GET    /api/leaves/:id    → getSingleLeave
 *   POST   /api/leaves        → createLeave    (staff applies for leave)
 *   PUT    /api/leaves/:id    → updateLeaveStatus  (admin approves/rejects)
 *   DELETE /api/leaves/:id    → deleteLeave    (admin only)
 */

const express = require('express');
const router  = express.Router();
const { protect, adminOnly, staffAdminOrDelivery } = require('../middleware/auth');
const { getAllLeaves, getSingleLeave, createLeave, updateLeaveStatus, deleteLeave } = require('../controllers/leaveController');

router.get('/',       protect, staffAdminOrDelivery, getAllLeaves);
router.get('/:id',    protect, staffAdminOrDelivery, getSingleLeave);
router.post('/',      protect, staffAdminOrDelivery, createLeave);
router.put('/:id',    protect, adminOnly,    updateLeaveStatus);
router.delete('/:id', protect, adminOnly,    deleteLeave);

module.exports = router;
/* END — File: routes/leaveRoutes.js  Mounted: /api/leaves */
