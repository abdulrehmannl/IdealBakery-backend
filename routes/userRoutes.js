/**
 * routes/userRoutes.js — Internal User Management Routes
 * ========================================================
 * Mounted: app.use('/api/users', userRoutes)
 * ALL routes: Admin only (protect + adminOnly)
 *
 * These routes manage internal accounts (staff, admin).
 * Customers are handled separately via auth routes.
 *
 *   GET    /api/users                    → getAllUsers          (?isActive)
 *   GET    /api/users/:id                → getSingleUser
 *   POST   /api/users                    → createUser           (admin sets phone+password)
 *   PUT    /api/users/:id                → updateUser           (edit details, reset password)
 *   PATCH  /api/users/:id/toggle-status  → toggleUserStatus     (activate / deactivate)
 *   DELETE /api/users/:id                → deleteUser           (hard delete)
 */

const express = require('express');
const router  = express.Router();
const { protect, adminOnly, staffOrAdmin } = require('../middleware/auth');
const {
    getAllUsers,
    getSingleUser,
    createUser,
    createStaff,
    updateUser,
    toggleUserStatus,
    deleteUser,
} = require('../controllers/userController');

// All routes are admin-only, except GET / which staff can also use (for assigning delivery)
router.post('/create-staff',           protect, adminOnly, createStaff);
router.get('/',                        protect, staffOrAdmin, getAllUsers);
router.get('/:id',                     protect, adminOnly, getSingleUser);
router.post('/',                       protect, adminOnly, createUser);
router.put('/:id',                     protect, adminOnly, updateUser);
router.patch('/:id/toggle-status',     protect, adminOnly, toggleUserStatus);
router.delete('/:id',                  protect, adminOnly, deleteUser);

module.exports = router;

/*
 * END OF FILE SUMMARY
 * =====================
 * File: routes/userRoutes.js  Mounted: /api/users
 *
 * Route                      Method   Middleware              Controller
 * /                          GET      protect, adminOnly      getAllUsers
 * /:id                       GET      protect, adminOnly      getSingleUser
 * /                          POST     protect, adminOnly      createUser
 * /:id                       PUT      protect, adminOnly      updateUser
 * /:id/toggle-status         PATCH    protect, adminOnly      toggleUserStatus
 * /:id                       DELETE   protect, adminOnly      deleteUser
 */
