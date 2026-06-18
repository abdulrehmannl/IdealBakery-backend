/**
 * routes/reportRoutes.js — Reports API Routes
 * =============================================
 * Mounted: app.use('/api/reports', reportRoutes)
 * All routes: Admin/Manager only
 *
 *   GET    /api/reports        → getAllReports   (?type ?branch)
 *   GET    /api/reports/:id    → getSingleReport (returns stored data field)
 *   POST   /api/reports        → generateReport  (auto-aggregates real DB data)
 *   DELETE /api/reports/:id    → deleteReport
 *
 * NOTE: No PUT — reports are immutable snapshots. Delete and regenerate instead.
 */

const express = require('express');
const router  = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { getAllReports, getSingleReport, generateReport, deleteReport } = require('../controllers/reportController');

router.get('/',       protect, adminOnly, getAllReports);
router.get('/:id',    protect, adminOnly, getSingleReport);
router.post('/',      protect, adminOnly, generateReport);
router.delete('/:id', protect, adminOnly, deleteReport);

module.exports = router;
/* END — File: routes/reportRoutes.js  Mounted: /api/reports */
