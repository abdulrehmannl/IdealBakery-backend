/**
 * controllers/expenseController.js — Expense Business Logic
 * ===========================================================
 * EXPENSE SCHEMA RECAP:
 *   branch    ObjectId ref:Branch  required
 *   title     String   required
 *   amount    Number   required
 *   category  enum: rent|electricity|packaging|salary|other  required
 *   date      Date     default:now
 *   paidBy    ObjectId ref:Staff   required
 *   notes     String   optional
 */

const Expense = require('../models/Expense');

// GET all expenses — Admin/Manager
// Filters: ?branch=id  ?category=rent  ?dateFrom=2026-04-01&dateTo=2026-04-30
const getAllExpenses = async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.branch)   filter.branch   = req.query.branch;
        if (req.query.category) filter.category = req.query.category;

        if (req.query.dateFrom || req.query.dateTo) {
            filter.date = {};
            if (req.query.dateFrom) filter.date.$gte = new Date(req.query.dateFrom);
            if (req.query.dateTo)   filter.date.$lte = new Date(req.query.dateTo);
        }

        const expenses = await Expense.find(filter)
            .populate('branch',  'name city')
            .sort({ date: -1 });

        // Calculate total for the filtered result
        const total = expenses.reduce((sum, e) => sum + e.amount, 0);

        return res.status(200).json({ success: true, count: expenses.length, totalAmount: total, data: expenses });
    } catch (error) { next(error); }
};

// GET single expense
const getSingleExpense = async (req, res, next) => {
    try {
        const expense = await Expense.findById(req.params.id)
            .populate('branch', 'name city');
        if (!expense)
            return res.status(404).json({ success: false, message: 'Expense not found.' });
        return res.status(200).json({ success: true, data: expense });
    } catch (error) { next(error); }
};

// POST create expense — Admin/Manager
const createExpense = async (req, res, next) => {
    try {
        const { branch, title, amount, category, date, paidBy, notes } = req.body;

        const missing = [];
        if (!branch)   missing.push('branch');
        if (!title)    missing.push('title');
        if (!amount)   missing.push('amount');
        if (!category) missing.push('category');
        if (!paidBy)   missing.push('paidBy');
        if (missing.length > 0)
            return res.status(400).json({ success: false, message: `Missing: ${missing.join(', ')}` });

        const expense = await Expense.create({ branch, title: title.trim(), amount, category, date: date || Date.now(), paidBy, notes });
        const populated = await Expense.findById(expense._id).populate('branch', 'name');
        return res.status(201).json({ success: true, message: 'Expense recorded.', data: populated });
    } catch (error) { next(error); }
};

// PUT update expense
const updateExpense = async (req, res, next) => {
    try {
        const { title, amount, category, date, notes, branch, paidBy } = req.body;
        const updateData = {};
        if (title    !== undefined) updateData.title    = title.trim();
        if (amount   !== undefined) updateData.amount   = amount;
        if (category !== undefined) updateData.category = category;
        if (date     !== undefined) updateData.date     = date;
        if (notes    !== undefined) updateData.notes    = notes;
        if (branch   !== undefined) updateData.branch   = branch;
        if (paidBy   !== undefined) updateData.paidBy   = paidBy;

        const expense = await Expense.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
            .populate('branch', 'name');
        if (!expense)
            return res.status(404).json({ success: false, message: 'Expense not found.' });
        return res.status(200).json({ success: true, message: 'Expense updated.', data: expense });
    } catch (error) { next(error); }
};

// DELETE expense
const deleteExpense = async (req, res, next) => {
    try {
        const expense = await Expense.findByIdAndDelete(req.params.id);
        if (!expense)
            return res.status(404).json({ success: false, message: 'Expense not found.' });
        return res.status(200).json({ success: true, message: 'Expense deleted.', data: null });
    } catch (error) { next(error); }
};

module.exports = { getAllExpenses, getSingleExpense, createExpense, updateExpense, deleteExpense };

/*
 * END OF FILE SUMMARY
 * File: controllers/expenseController.js
 * GET    /api/expenses       → getAllExpenses (?branch ?category ?dateFrom ?dateTo)
 *                              Returns totalAmount sum in response
 * GET    /api/expenses/:id   → getSingleExpense
 * POST   /api/expenses       → createExpense
 * PUT    /api/expenses/:id   → updateExpense
 * DELETE /api/expenses/:id   → deleteExpense
 * All Admin/Manager only.
 */
