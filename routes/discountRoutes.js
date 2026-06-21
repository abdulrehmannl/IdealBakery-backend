/**
 * routes/discountRoutes.js — Discount API Routes
 * ================================================
 * Mounted: app.use('/api/discounts', discountRoutes)
 *
 *   GET    /api/discounts        → getAllDiscounts    (Public — shows deals on homepage)
 *   GET    /api/discounts/:id    → getSingleDiscount  (Public)
 *   POST   /api/discounts        → createDiscount     (Admin/Manager)
 *   PUT    /api/discounts/:id    → updateDiscount     (Admin/Manager)
 *   DELETE /api/discounts/:id    → deleteDiscount     (Admin/Manager)
 */

const express = require('express');
const router  = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { getAllDiscounts, getSingleDiscount, createDiscount, updateDiscount, deleteDiscount, validateDiscount } = require('../controllers/discountController');

router.get('/',       getAllDiscounts);                         // Public
router.get('/:id',    getSingleDiscount);                      // Public
router.post('/validate', validateDiscount);                    // Public
router.post('/',      protect, adminOnly, createDiscount);
router.put('/:id',    protect, adminOnly, updateDiscount);
router.delete('/:id', protect, adminOnly, deleteDiscount);

module.exports = router;
/* END — File: routes/discountRoutes.js  Mounted: /api/discounts */
