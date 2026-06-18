/**
 * routes/counterRoutes.js — Counter Sales API Routes
 * ====================================================
 * Mounted: app.use('/api/counter', counterRoutes)
 * Access: staffOrAdmin — staff at the counter can create and view sales.
 *   DELETE is admin-only.
 *
 *   GET    /api/counter        → getAllCounterSales (?branch ?staff ?paymentMethod ?dateFrom ?dateTo)
 *   GET    /api/counter/:id    → getSingleCounterSale
 *   POST   /api/counter        → createCounterSale
 *   PUT    /api/counter/:id    → updateCounterSale
 *   DELETE /api/counter/:id    → deleteCounterSale   (admin only)
 */

const express = require('express');
const router  = express.Router();
const { protect, adminOnly, staffOrAdmin } = require('../middleware/auth');
const { getAllCounterSales, getSingleCounterSale, createCounterSale, updateCounterSale, deleteCounterSale } = require('../controllers/counterController');

router.get('/',       protect, staffOrAdmin, getAllCounterSales);
router.get('/:id',    protect, staffOrAdmin, getSingleCounterSale);
router.post('/',      protect, staffOrAdmin, createCounterSale);
router.put('/:id',    protect, staffOrAdmin, updateCounterSale);
router.delete('/:id', protect, adminOnly,    deleteCounterSale);

module.exports = router;
/* END — File: routes/counterRoutes.js  Mounted: /api/counter */
