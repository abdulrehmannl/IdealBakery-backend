/**
 * controllers/inventoryController.js — Inventory Business Logic
 * ==============================================================
 * INVENTORY SCHEMA RECAP:
 *   name        String   required
 *   branch      ObjectId ref:Branch  required
 *   unit        enum: kg|ltr|pcs|grams  required
 *   quantity    Number   required
 *   minStock    Number   optional  (for low-stock alerts)
 *   costPerUnit Number   optional
 *   lastUpdated Date     default:now
 *   Unique index: { name + branch } — same ingredient can't be duplicated per branch
 */

const Inventory = require('../models/Inventory');

// GET all inventory items — Admin/Manager
// Filters: ?branch=id  ?lowStock=true (items below minStock)
const getAllInventory = async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.branch) filter.branch = req.query.branch;

        let items = await Inventory.find(filter)
            .populate('branch', 'name city')
            .sort({ name: 1 });

        // Filter low-stock items: quantity < minStock
        if (req.query.lowStock === 'true') {
            items = items.filter(i => i.minStock && i.quantity < i.minStock);
        }

        return res.status(200).json({ success: true, count: items.length, data: items });
    } catch (error) { next(error); }
};

// GET single inventory item
const getSingleInventory = async (req, res, next) => {
    try {
        const item = await Inventory.findById(req.params.id).populate('branch', 'name city');
        if (!item) return res.status(404).json({ success: false, message: 'Inventory item not found.' });
        return res.status(200).json({ success: true, data: item });
    } catch (error) { next(error); }
};

// POST create inventory item
const createInventory = async (req, res, next) => {
    try {
        const { name, branch, unit, quantity, minStock, costPerUnit } = req.body;

        const missing = [];
        if (!name)     missing.push('name');
        if (!branch)   missing.push('branch');
        if (!unit)     missing.push('unit');
        if (quantity === undefined) missing.push('quantity');
        if (missing.length > 0)
            return res.status(400).json({ success: false, message: `Missing: ${missing.join(', ')}` });

        const item = await Inventory.create({ name: name.trim(), branch, unit, quantity, minStock, costPerUnit, lastUpdated: new Date() });
        const populated = await Inventory.findById(item._id).populate('branch', 'name city');
        return res.status(201).json({ success: true, message: `"${item.name}" added to inventory.`, data: populated });
    } catch (error) { next(error); }
};

// PUT update — supports quantity adjustments and full updates
const updateInventory = async (req, res, next) => {
    try {
        const { name, unit, quantity, minStock, costPerUnit, branch } = req.body;
        const updateData = { lastUpdated: new Date() };

        if (name        !== undefined) updateData.name        = name.trim();
        if (unit        !== undefined) updateData.unit        = unit;
        if (quantity    !== undefined) updateData.quantity    = quantity;
        if (minStock    !== undefined) updateData.minStock    = minStock;
        if (costPerUnit !== undefined) updateData.costPerUnit = costPerUnit;
        if (branch      !== undefined) updateData.branch      = branch;

        const item = await Inventory.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
            .populate('branch', 'name city');

        if (!item) return res.status(404).json({ success: false, message: 'Inventory item not found.' });
        return res.status(200).json({ success: true, message: `"${item.name}" updated.`, data: item });
    } catch (error) { next(error); }
};

// DELETE inventory item
const deleteInventory = async (req, res, next) => {
    try {
        const item = await Inventory.findByIdAndDelete(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: 'Inventory item not found.' });
        return res.status(200).json({ success: true, message: `"${item.name}" deleted.`, data: null });
    } catch (error) { next(error); }
};

module.exports = { getAllInventory, getSingleInventory, createInventory, updateInventory, deleteInventory };

/*
 * END OF FILE SUMMARY
 * File: controllers/inventoryController.js
 * GET  /api/inventory          → getAllInventory  (?branch ?lowStock=true)
 * GET  /api/inventory/:id      → getSingleInventory
 * POST /api/inventory          → createInventory
 * PUT  /api/inventory/:id      → updateInventory
 * DELETE /api/inventory/:id    → deleteInventory
 * All Admin/Manager only.
 * Unique index on {name+branch} enforced by MongoDB.
 */
