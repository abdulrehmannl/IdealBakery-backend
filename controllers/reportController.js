/**
 * controllers/reportController.js — Reports Business Logic
 * =========================================================
 * REPORT SCHEMA RECAP:
 *   title       String   required
 *   type        enum: sales|attendance|inventory|salary  required
 *   branch      ObjectId ref:Branch  optional (null = all branches)
 *   generatedBy ObjectId ref:Staff   required
 *   dateFrom    Date     required
 *   dateTo      Date     required
 *   summary     String   optional
 *   data        Mixed    optional  (flexible JSON — can store aggregated results)
 *
 * Reports are stored snapshots — when admin generates a report, the results
 * are saved in the `data` field as JSON so they can be retrieved later
 * without re-running the aggregation.
 */

const Reports = require('../models/Report');
const Order        = require('../models/Order');
const Attendance   = require('../models/Attendance');
const Inventory    = require('../models/Inventory');
const Salary       = require('../models/Salary');

// GET all reports — Admin/Manager
// Filters: ?type=sales  ?branch=id
const getAllReports = async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.type)   filter.type   = req.query.type;
        if (req.query.branch) filter.branch = req.query.branch;

        const reports = await Reports.find(filter)
            .populate('branch',      'name city')
            .populate('generatedBy', 'name role')
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, count: reports.length, data: reports });
    } catch (error) { next(error); }
};

// GET single report
const getSingleReport = async (req, res, next) => {
    try {
        const report = await Reports.findById(req.params.id)
            .populate('branch', 'name city')
            .populate('generatedBy', 'name role');
        if (!report)
            return res.status(404).json({ success: false, message: 'Report not found.' });
        return res.status(200).json({ success: true, data: report });
    } catch (error) { next(error); }
};

// POST generate and save a report — Admin/Manager
// The controller auto-fetches real data from the DB based on type+dateRange
const generateReport = async (req, res, next) => {
    try {
        const { title, type, branch, generatedBy, dateFrom, dateTo, summary } = req.body;

        const missing = [];
        if (!title)       missing.push('title');
        if (!type)        missing.push('type');
        if (!generatedBy) missing.push('generatedBy');
        if (!dateFrom)    missing.push('dateFrom');
        if (!dateTo)      missing.push('dateTo');
        if (missing.length > 0)
            return res.status(400).json({ success: false, message: `Missing: ${missing.join(', ')}` });

        if (new Date(dateTo) < new Date(dateFrom))
            return res.status(400).json({ success: false, message: 'dateTo must be on or after dateFrom.' });

        // ── Auto-generate report data based on type ──
        // This fetches real aggregated numbers from each collection
        let reportData = {};
        const from = new Date(dateFrom);
        const to   = new Date(dateTo);
        const branchFilter = branch ? { branch } : {};

        if (type === 'sales') {
            // Count orders and sum revenue in the date range
            const orders = await Order.find({ createdAt: { $gte: from, $lte: to }, ...branchFilter });
            reportData = {
                totalOrders:  orders.length,
                totalRevenue: orders.reduce((s, o) => s + o.totalAmount, 0),
                byStatus: {
                    pending:   orders.filter(o => o.status === 'pending').length,
                    confirmed: orders.filter(o => o.status === 'confirmed').length,
                    preparing: orders.filter(o => o.status === 'preparing').length,
                    delivered: orders.filter(o => o.status === 'delivered').length,
                    cancelled: orders.filter(o => o.status === 'cancelled').length,
                },
            };
        }

        if (type === 'attendance') {
            const records = await Attendance.find({ date: { $gte: from, $lte: to } });
            reportData = {
                totalRecords: records.length,
                present:  records.filter(r => r.status === 'present').length,
                absent:   records.filter(r => r.status === 'absent').length,
                late:     records.filter(r => r.status === 'late').length,
                halfday:  records.filter(r => r.status === 'halfday').length,
            };
        }

        if (type === 'inventory') {
            const items = await Inventory.find(branchFilter);
            const lowStock = items.filter(i => i.minStock && i.quantity < i.minStock);
            reportData = {
                totalItems:     items.length,
                lowStockItems:  lowStock.length,
                lowStockNames:  lowStock.map(i => i.name),
                totalCostValue: items.reduce((s, i) => s + ((i.costPerUnit || 0) * i.quantity), 0),
            };
        }

        if (type === 'salary') {
            const salaries = await Salary.find({ createdAt: { $gte: from, $lte: to } });
            reportData = {
                totalRecords:  salaries.length,
                totalPaid:     salaries.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.netSalary, 0),
                totalPending:  salaries.filter(s => s.status === 'pending').reduce((sum, s) => sum + s.netSalary, 0),
                paidCount:     salaries.filter(s => s.status === 'paid').length,
                pendingCount:  salaries.filter(s => s.status === 'pending').length,
            };
        }

        // Save the report with auto-generated data
        const report = await Reports.create({ title: title.trim(), type, branch: branch || null, generatedBy, dateFrom: from, dateTo: to, summary, data: reportData });
        const populated = await Reports.findById(report._id).populate('branch', 'name').populate('generatedBy', 'name role');

        return res.status(201).json({ success: true, message: `Report "${report.title}" generated.`, data: populated });
    } catch (error) { next(error); }
};

// DELETE report
const deleteReport = async (req, res, next) => {
    try {
        const report = await Reports.findByIdAndDelete(req.params.id);
        if (!report)
            return res.status(404).json({ success: false, message: 'Report not found.' });
        return res.status(200).json({ success: true, message: `Report "${report.title}" deleted.`, data: null });
    } catch (error) { next(error); }
};

module.exports = { getAllReports, getSingleReport, generateReport, deleteReport };

/*
 * END OF FILE SUMMARY
 * File: controllers/reportController.js
 * GET    /api/reports       → getAllReports (?type ?branch)
 * GET    /api/reports/:id   → getSingleReport (includes stored data field)
 * POST   /api/reports       → generateReport (auto-aggregates from DB based on type)
 *   type=sales      → counts orders, revenue, breakdown by status
 *   type=attendance → counts present/absent/late/halfday
 *   type=inventory  → counts items, low-stock names, total cost value
 *   type=salary     → sums paid vs pending salaries
 * DELETE /api/reports/:id   → deleteReport
 * All Admin/Manager only.
 */
