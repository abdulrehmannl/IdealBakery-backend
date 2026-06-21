/**
 * routes/salaryRoutes.js — Salary API Routes
 * ============================================
 * Mounted: app.use('/api/salaries', salaryRoutes)
 * All routes: Admin/Manager only
 *
 *   GET    /api/salaries        → getAllSalaries  (?staff ?month ?year ?status)
 *   GET    /api/salaries/:id    → getSingleSalary
 *   POST   /api/salaries        → createSalary
 *   PUT    /api/salaries/:id    → updateSalary
 *   DELETE /api/salaries/:id    → deleteSalary
 */

const express = require('express');
const router  = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { getAllSalaries, getSingleSalary, createSalary, updateSalary, deleteSalary, paySalary } = require('../controllers/salaryController');

const managerOrAdmin = (req, res, next) => {
    if (req.user && ['admin', 'manager'].includes(req.user.role)) return next();
    return res.status(403).json({ success: false, message: 'Access denied. Managers/Admins only.' });
};

router.get('/',       protect, managerOrAdmin, getAllSalaries);
router.get('/:id',    protect, managerOrAdmin, getSingleSalary);
router.post('/',      protect, adminOnly, createSalary);
router.put('/:id',    protect, adminOnly, updateSalary);
router.put('/:id/pay', protect, adminOnly, paySalary);
router.delete('/:id', protect, adminOnly, deleteSalary);

module.exports = router;
/* END — File: routes/salaryRoutes.js  Mounted: /api/salaries */
