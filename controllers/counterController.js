/**
 * controllers/counterController.js — Counter Sales Business Logic
 * ================================================================
 * COUNTER SALES SCHEMA RECAP:
 *   branch        ObjectId ref:Branch  required
 *   staff         ObjectId ref:Staff   required
 *   items         Array of:
 *     product     ObjectId ref:Product  required
 *     quantity    Number min:1          required
 *     price       Number                required
 *   saleDate      Date  default:now
 *   customerName  String  optional
 *   totalAmount   Number  required
 *   paymentMethod enum: cash|card|online  required
 *   notes         String  optional
 *
 * Counter Sales = walk-in sales at the physical bakery counter.
 * Different from online Orders — no delivery address needed.
 * The staff member records who bought what, how much, and how they paid.
 */

const CounterSales = require('../models/CounterSales');
const Product = require('../models/Product');

// GET all counter sales — Admin/Manager
// Filters: ?branch=id  ?staff=id  ?paymentMethod=cash
// Date range: ?dateFrom=2026-04-01&dateTo=2026-04-30
const getAllCounterSales = async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.branch)        filter.branch        = req.query.branch;
        if (req.query.staff)         filter.staff         = req.query.staff;
        if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;

        if (req.query.dateFrom || req.query.dateTo) {
            filter.saleDate = {};
            if (req.query.dateFrom) filter.saleDate.$gte = new Date(req.query.dateFrom);
            if (req.query.dateTo)   filter.saleDate.$lte = new Date(req.query.dateTo);
        }

        const sales = await CounterSales.find(filter)
            .populate('branch',  'name city')
            .populate('staff', 'name role')
            .populate('items.product', 'name price')
            .sort({ saleDate: -1 });

        // Calculate total revenue for the filtered result
        const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);

        return res.status(200).json({ success: true, count: sales.length, totalRevenue, data: sales });
    } catch (error) { next(error); }
};

// GET single counter sale
const getSingleCounterSale = async (req, res, next) => {
    try {
        const sale = await CounterSales.findById(req.params.id)
            .populate('branch',  'name city address')
            .populate('staff', 'name role phone')
            .populate('items.product', 'name price image');
        if (!sale)
            return res.status(404).json({ success: false, message: 'Counter sale not found.' });
        return res.status(200).json({ success: true, data: sale });
    } catch (error) { next(error); }
};

// POST record a new counter sale — Admin/Manager (or staff role later)
const createCounterSale = async (req, res, next) => {
    try {
        const { branch, staff, items, customerName, totalAmount, paymentMethod, notes, saleDate } = req.body;

        const missing = [];
        if (!branch)        missing.push('branch');
        if (!staff)         missing.push('staff');
        if (!totalAmount)   missing.push('totalAmount');
        if (!paymentMethod) missing.push('paymentMethod');
        if (!items || !Array.isArray(items) || items.length === 0)
            missing.push('items (non-empty array)');
        if (missing.length > 0)
            return res.status(400).json({ success: false, message: `Missing: ${missing.join(', ')}` });

        // Validate each item has product, quantity, price
        for (const item of items) {
            if (!item.product || !item.quantity || !item.price) {
                return res.status(400).json({ success: false, message: 'Each item must have product, quantity, and price.' });
            }
        }

        const sale = await CounterSales.create({
            branch, staff, items, customerName, totalAmount, paymentMethod, notes,
            saleDate: saleDate || Date.now(),
        });

        // Deduct from Product stock
        for (const item of items) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { stock: -item.quantity }
            });
        }

        const populated = await CounterSales.findById(sale._id)
            .populate('branch', 'name').populate('staff', 'name role')
            .populate('items.product', 'name price');

        return res.status(201).json({ success: true, message: 'Counter sale recorded.', data: populated });
    } catch (error) { next(error); }
};

// PUT update counter sale (corrections)
const updateCounterSale = async (req, res, next) => {
    try {
        const { customerName, totalAmount, paymentMethod, notes } = req.body;
        const updateData = {};
        if (customerName  !== undefined) updateData.customerName  = customerName;
        if (totalAmount   !== undefined) updateData.totalAmount   = totalAmount;
        if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
        if (notes         !== undefined) updateData.notes         = notes;

        const sale = await CounterSales.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
            .populate('branch', 'name').populate('staff', 'name role');
        if (!sale)
            return res.status(404).json({ success: false, message: 'Counter sale not found.' });
        return res.status(200).json({ success: true, message: 'Counter sale updated.', data: sale });
    } catch (error) { next(error); }
};

// DELETE counter sale record
const deleteCounterSale = async (req, res, next) => {
    try {
        const sale = await CounterSales.findByIdAndDelete(req.params.id);
        if (!sale)
            return res.status(404).json({ success: false, message: 'Counter sale not found.' });
        return res.status(200).json({ success: true, message: 'Counter sale deleted.', data: null });
    } catch (error) { next(error); }
};

module.exports = { getAllCounterSales, getSingleCounterSale, createCounterSale, updateCounterSale, deleteCounterSale };

/*
 * END OF FILE SUMMARY
 * File: controllers/counterController.js
 * GET    /api/counter       → getAllCounterSales (?branch ?staff ?paymentMethod ?dateFrom ?dateTo)
 *                             Returns totalRevenue in response
 * GET    /api/counter/:id   → getSingleCounterSale (full item detail with product populate)
 * POST   /api/counter       → createCounterSale (validates each item has product+qty+price)
 * PUT    /api/counter/:id   → updateCounterSale
 * DELETE /api/counter/:id   → deleteCounterSale
 * All Admin/Manager only.
 */
