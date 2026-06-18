/**
 * routes/expenseRoutes.js — Expense API Routes
 * ==============================================
 * Mounted: app.use('/api/expenses', expenseRoutes)
 * All routes: Admin/Manager only
 *
 *   GET    /api/expenses        → getAllExpenses  (?branch ?category ?dateFrom ?dateTo)
 *   GET    /api/expenses/:id    → getSingleExpense
 *   POST   /api/expenses        → createExpense
 *   PUT    /api/expenses/:id    → updateExpense
 *   DELETE /api/expenses/:id    → deleteExpense
 */

const express = require('express');
const router  = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { getAllExpenses, getSingleExpense, createExpense, updateExpense, deleteExpense } = require('../controllers/expenseController');

router.get('/',       protect, adminOnly, getAllExpenses);
router.get('/:id',    protect, adminOnly, getSingleExpense);
router.post('/',      protect, adminOnly, createExpense);
router.put('/:id',    protect, adminOnly, updateExpense);
router.delete('/:id', protect, adminOnly, deleteExpense);

module.exports = router;
/* END — File: routes/expenseRoutes.js  Mounted: /api/expenses */
