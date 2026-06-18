/**
 * controllers/salaryController.js — Salary Business Logic
 * =========================================================
 * SALARY SCHEMA RECAP:
 *   staff         ObjectId ref:Staff  required
 *   month         enum: Jan|Feb|...|Dec  required
 *   year          Number  required
 *   basicSalary   Number  required
 *   bonus         Number  default:0
 *   deductions    Number  default:0
 *   netSalary     Number  required   (basicSalary + bonus - deductions)
 *   paymentDate   Date    optional
 *   paymentMethod enum: cash|bank|online  optional
 *   status        enum: pending|paid  default:pending
 *   notes         String  optional
 *   Unique index: { staff + month + year } — one salary record per staff per month
 */

const Salary = require('../models/Salary');

// GET all salary records — Admin/Manager
// Filters: ?staff=id  ?month=Jan  ?year=2026  ?status=pending
const getAllSalaries = async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.staff)  filter.staff  = req.query.staff;
        if (req.query.month)  filter.month  = req.query.month;
        if (req.query.year)   filter.year   = Number(req.query.year);
        if (req.query.status) filter.status = req.query.status;

        const salaries = await Salary.find(filter)
            .populate({ path: 'staff', select: 'name role', populate: { path: 'branch', select: 'name' } })
            .sort({ year: -1, month: -1 });

        return res.status(200).json({ success: true, count: salaries.length, data: salaries });
    } catch (error) { next(error); }
};

// GET single salary record
const getSingleSalary = async (req, res, next) => {
    try {
        const salary = await Salary.findById(req.params.id).populate('staff', 'name role phone');
        if (!salary) return res.status(404).json({ success: false, message: 'Salary record not found.' });
        return res.status(200).json({ success: true, data: salary });
    } catch (error) { next(error); }
};

// POST create a salary record
const createSalary = async (req, res, next) => {
    try {
        const { staff, month, year, basicSalary, bonus, deductions, paymentDate, paymentMethod, notes } = req.body;

        const missing = [];
        if (!staff)       missing.push('staff');
        if (!month)       missing.push('month');
        if (!year)        missing.push('year');
        if (!basicSalary) missing.push('basicSalary');
        if (missing.length > 0)
            return res.status(400).json({ success: false, message: `Missing: ${missing.join(', ')}` });

        // Auto-calculate netSalary
        const b = Number(basicSalary);
        const bo = Number(bonus || 0);
        const d = Number(deductions || 0);
        const netSalary = b + bo - d;

        const salary = await Salary.create({
            staff, month, year: Number(year), basicSalary: b, bonus: bo, deductions: d,
            netSalary, paymentDate, paymentMethod, notes,
        });

        const populated = await Salary.findById(salary._id).populate('staff', 'name role');
        return res.status(201).json({ success: true, message: 'Salary record created.', data: populated });
    } catch (error) { next(error); }
};

// PUT update salary (mark as paid, add bonus etc.)
const updateSalary = async (req, res, next) => {
    try {
        const { basicSalary, bonus, deductions, paymentDate, paymentMethod, status, notes } = req.body;
        const updateData = {};

        if (basicSalary   !== undefined) updateData.basicSalary   = Number(basicSalary);
        if (bonus         !== undefined) updateData.bonus         = Number(bonus);
        if (deductions    !== undefined) updateData.deductions    = Number(deductions);
        if (paymentDate   !== undefined) updateData.paymentDate   = paymentDate;
        if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
        if (status        !== undefined) updateData.status        = status;
        if (notes         !== undefined) updateData.notes         = notes;

        // Recalculate netSalary if financial fields changed
        if (updateData.basicSalary !== undefined || updateData.bonus !== undefined || updateData.deductions !== undefined) {
            // Fetch current record to get unchanged values
            const current = await Salary.findById(req.params.id);
            if (current) {
                const b  = updateData.basicSalary  ?? current.basicSalary;
                const bo = updateData.bonus         ?? current.bonus;
                const d  = updateData.deductions    ?? current.deductions;
                updateData.netSalary = b + bo - d;
            }
        }

        const salary = await Salary.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
            .populate('staff', 'name role');

        if (!salary) return res.status(404).json({ success: false, message: 'Salary record not found.' });
        return res.status(200).json({ success: true, message: 'Salary record updated.', data: salary });
    } catch (error) { next(error); }
};

// DELETE salary record
const deleteSalary = async (req, res, next) => {
    try {
        const salary = await Salary.findByIdAndDelete(req.params.id);
        if (!salary) return res.status(404).json({ success: false, message: 'Salary record not found.' });
        return res.status(200).json({ success: true, message: 'Salary record deleted.', data: null });
    } catch (error) { next(error); }
};

module.exports = { getAllSalaries, getSingleSalary, createSalary, updateSalary, deleteSalary };

/*
 * END OF FILE SUMMARY
 * File: controllers/salaryController.js
 * GET    /api/salaries       → getAllSalaries  (?staff ?month ?year ?status)
 * GET    /api/salaries/:id   → getSingleSalary
 * POST   /api/salaries       → createSalary (auto-calculates netSalary)
 * PUT    /api/salaries/:id   → updateSalary (recalculates netSalary if financials change)
 * DELETE /api/salaries/:id   → deleteSalary
 */
