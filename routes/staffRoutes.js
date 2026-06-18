/**
 * routes/staffRoutes.js — Staff API Routes
 * ==========================================
 * Mounted: app.use('/api/staff', staffRoutes)
 * ALL routes are Admin/Manager protected — staff data is internal.
 *
 *   GET    /api/staff        → getAllStaff      (?branch  ?role  ?isActive)
 *   GET    /api/staff/:id    → getSingleStaff
 *   POST   /api/staff        → createStaff
 *   PUT    /api/staff/:id    → updateStaff
 *   DELETE /api/staff/:id    → deleteStaff
 */

const express = require('express');
const router  = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { getAllStaff, getSingleStaff, createStaff, updateStaff, deleteStaff } = require('../controllers/staffController');

router.get('/',      protect, adminOnly, getAllStaff);
router.get('/:id',   protect, adminOnly, getSingleStaff);
router.post('/',     protect, adminOnly, createStaff);
router.put('/:id',   protect, adminOnly, updateStaff);
router.delete('/:id',protect, adminOnly, deleteStaff);

module.exports = router;

/* END OF FILE SUMMARY — File: routes/staffRoutes.js  Mounted: /api/staff */
