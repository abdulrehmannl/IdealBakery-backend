/**
 * routes/machineryRoutes.js — Machinery + Maintenance API Routes
 * ===============================================================
 * Mounted: app.use('/api/machinery', machineryRoutes)
 * All routes: Admin/Manager only
 *
 *   GET    /api/machinery                             → getAllMachinery
 *   GET    /api/machinery/:id                         → getSingleMachinery (+ maintenance history)
 *   POST   /api/machinery                             → createMachinery
 *   PUT    /api/machinery/:id                         → updateMachinery
 *   DELETE /api/machinery/:id                         → deleteMachinery
 *   POST   /api/machinery/:id/maintenance             → addMaintenanceRecord
 *   PUT    /api/machinery/:id/maintenance/:recordId   → updateMaintenanceRecord
 *
 * NOTE: Nested routes for maintenance records follow REST conventions:
 *   /api/machinery/:id/maintenance = maintenance records FOR machine :id
 */

const express = require('express');
const router  = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
    getAllMachinery, getSingleMachinery, createMachinery, updateMachinery, deleteMachinery,
    addMaintenanceRecord, updateMaintenanceRecord,
} = require('../controllers/machineryController');

// Machinery routes
router.get('/',       protect, adminOnly, getAllMachinery);
router.get('/:id',    protect, adminOnly, getSingleMachinery);
router.post('/',      protect, adminOnly, createMachinery);
router.put('/:id',    protect, adminOnly, updateMachinery);
router.delete('/:id', protect, adminOnly, deleteMachinery);

// Nested maintenance record routes
router.post('/:id/maintenance',              protect, adminOnly, addMaintenanceRecord);
router.put('/:id/maintenance/:recordId',     protect, adminOnly, updateMaintenanceRecord);

module.exports = router;
/* END — File: routes/machineryRoutes.js  Mounted: /api/machinery */
