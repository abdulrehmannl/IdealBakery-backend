/**
 * controllers/discountController.js — Discount Business Logic
 * =============================================================
 * DISCOUNT SCHEMA RECAP:
 *   title        String   required
 *   description  String   optional
 *   discountType enum: percentage|flat  required
 *   value        Number   required  (e.g. 10 = 10% or Rs.10 flat)
 *   product      ObjectId ref:Product  optional (null = applies to all)
 *   startDate    Date     required
 *   endDate      Date     required
 *   isActive     Boolean  default:true
 */

const Discount = require('../models/Discount');

// GET all discounts — Public (frontend shows active deals)
// Filters: ?isActive=true  ?product=id
const getAllDiscounts = async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.isActive !== undefined)
            filter.isActive = req.query.isActive === 'true';
        if (req.query.product)
            filter.product = req.query.product;

        const discounts = await Discount.find(filter)
            .populate('product', 'name price')
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, count: discounts.length, data: discounts });
    } catch (error) { next(error); }
};

// GET single discount
const getSingleDiscount = async (req, res, next) => {
    try {
        const discount = await Discount.findById(req.params.id)
            .populate('product', 'name price');
        if (!discount)
            return res.status(404).json({ success: false, message: 'Discount not found.' });
        return res.status(200).json({ success: true, data: discount });
    } catch (error) { next(error); }
};

// POST create discount — Admin/Manager
const createDiscount = async (req, res, next) => {
    try {
        const { title, description, discountType, value, product, startDate, endDate } = req.body;

        const missing = [];
        if (!title)        missing.push('title');
        if (!discountType) missing.push('discountType');
        if (!value)        missing.push('value');
        if (!startDate)    missing.push('startDate');
        if (!endDate)      missing.push('endDate');
        if (missing.length > 0)
            return res.status(400).json({ success: false, message: `Missing: ${missing.join(', ')}` });

        if (new Date(endDate) < new Date(startDate))
            return res.status(400).json({ success: false, message: 'endDate must be on or after startDate.' });

        if (discountType === 'percentage' && (value <= 0 || value > 100))
            return res.status(400).json({ success: false, message: 'Percentage discount must be between 1 and 100.' });

        const discount = await Discount.create({ title: title.trim(), description, discountType, value, product: product || null, startDate, endDate });
        const populated = await Discount.findById(discount._id).populate('product', 'name price');
        return res.status(201).json({ success: true, message: `Discount "${discount.title}" created.`, data: populated });
    } catch (error) { next(error); }
};

// PUT update discount
const updateDiscount = async (req, res, next) => {
    try {
        const { title, description, discountType, value, product, startDate, endDate, isActive } = req.body;
        const updateData = {};
        if (title        !== undefined) updateData.title        = title.trim();
        if (description  !== undefined) updateData.description  = description;
        if (discountType !== undefined) updateData.discountType = discountType;
        if (value        !== undefined) updateData.value        = value;
        if (product      !== undefined) updateData.product      = product || null;
        if (startDate    !== undefined) updateData.startDate    = startDate;
        if (endDate      !== undefined) updateData.endDate      = endDate;
        if (isActive     !== undefined) updateData.isActive     = isActive;

        const discount = await Discount.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
            .populate('product', 'name price');
        if (!discount)
            return res.status(404).json({ success: false, message: 'Discount not found.' });
        return res.status(200).json({ success: true, message: `Discount "${discount.title}" updated.`, data: discount });
    } catch (error) { next(error); }
};

// DELETE discount
const deleteDiscount = async (req, res, next) => {
    try {
        const discount = await Discount.findByIdAndDelete(req.params.id);
        if (!discount)
            return res.status(404).json({ success: false, message: 'Discount not found.' });
        return res.status(200).json({ success: true, message: `Discount "${discount.title}" deleted.`, data: null });
    } catch (error) { next(error); }
};

module.exports = { getAllDiscounts, getSingleDiscount, createDiscount, updateDiscount, deleteDiscount };

/*
 * END OF FILE SUMMARY
 * File: controllers/discountController.js
 * GET    /api/discounts       → getAllDiscounts  (?isActive ?product) — Public
 * GET    /api/discounts/:id   → getSingleDiscount — Public
 * POST   /api/discounts       → createDiscount — Admin/Manager
 * PUT    /api/discounts/:id   → updateDiscount — Admin/Manager
 * DELETE /api/discounts/:id   → deleteDiscount — Admin/Manager
 * Validates: endDate >= startDate, percentage value 1-100
 */
