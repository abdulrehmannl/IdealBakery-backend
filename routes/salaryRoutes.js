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
const { getAllSalaries, getSingleSalary, createSalary, updateSalary, deleteSalary } = require('../controllers/salaryController');

router.get('/',       protect, adminOnly, getAllSalaries);
router.get('/:id',    protect, adminOnly, getSingleSalary);
router.post('/',      protect, adminOnly, createSalary);
router.put('/:id',    protect, adminOnly, updateSalary);
router.delete('/:id', protect, adminOnly, deleteSalary);

module.exports = router;
/* END — File: routes/salaryRoutes.js  Mounted: /api/salaries */
