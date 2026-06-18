/**
 * routes/inventoryRoutes.js — Inventory API Routes
 * ==================================================
 * Mounted: app.use('/api/inventory', inventoryRoutes)
 * Access:
 *   - GET (view)    → staffOrAdmin  (staff can see stock levels)
 *   - POST/PUT/DELETE → adminOnly   (only admin can add/edit/remove inventory items)
 *
 *   GET    /api/inventory        → getAllInventory   (?branch ?lowStock=true)
 *   GET    /api/inventory/:id    → getSingleInventory
 *   POST   /api/inventory        → createInventory   (admin only)
 *   PUT    /api/inventory/:id    → updateInventory    (admin only)
 *   DELETE /api/inventory/:id    → deleteInventory    (admin only)
 */

const express = require('express');
const router  = express.Router();
const { protect, adminOnly, staffOrAdmin } = require('../middleware/auth');
const { getAllInventory, getSingleInventory, createInventory, updateInventory, deleteInventory } = require('../controllers/inventoryController');

router.get('/',       protect, staffOrAdmin, getAllInventory);
router.get('/:id',    protect, staffOrAdmin, getSingleInventory);
router.post('/',      protect, adminOnly,    createInventory);
router.put('/:id',    protect, adminOnly,    updateInventory);
router.delete('/:id', protect, adminOnly,    deleteInventory);

module.exports = router;
/* END — File: routes/inventoryRoutes.js  Mounted: /api/inventory */
