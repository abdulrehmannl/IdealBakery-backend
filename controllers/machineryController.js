/**
 * controllers/machineryController.js — Machinery + Maintenance Business Logic
 * =============================================================================
 * MACHINERY SCHEMA RECAP:
 *   name           String   required
 *   branch         ObjectId ref:Branch  required
 *   purchaseDate   Date     optional
 *   purchaseCost   Number   optional
 *   condition      enum: good|maintenance|broken  required
 *   description    String   optional
 *   isActive       Boolean  default:true
 *   warrantyExpiry Date     optional
 *
 * MAINTENANCE RECORD SCHEMA:
 *   machinery    ObjectId ref:Machinery  required
 *   description  String   required
 *   cost         Number   optional
 *   date         Date     default:now
 *   status       enum: pending|inprogress|completed  required
 *   conductedBy  String   optional
 *   notes        String   optional
 *
 * This single controller handles BOTH machinery and maintenance records
 * to keep machinery management in one place.
 */

const Machinery         = require('../models/Machinery');
const MaintenanceRecord = require('../models/MaintenanceRecord');

// ── MACHINERY CRUD ──────────────────────────────────────────────────────────

// GET all machinery — Filters: ?branch=id  ?condition=broken  ?isActive=true
const getAllMachinery = async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.branch)    filter.branch    = req.query.branch;
        if (req.query.condition) filter.condition = req.query.condition;
        if (req.query.isActive !== undefined)
            filter.isActive = req.query.isActive === 'true';

        const machinery = await Machinery.find(filter)
            .populate('branch', 'name city')
            .sort({ createdAt: -1 });
        return res.status(200).json({ success: true, count: machinery.length, data: machinery });
    } catch (error) { next(error); }
};

// GET single machine
const getSingleMachinery = async (req, res, next) => {
    try {
        const machine = await Machinery.findById(req.params.id).populate('branch', 'name city');
        if (!machine)
            return res.status(404).json({ success: false, message: 'Machinery not found.' });
        // Also fetch maintenance history for this machine
        const maintenanceHistory = await MaintenanceRecord.find({ machinery: req.params.id }).sort({ date: -1 });
        return res.status(200).json({ success: true, data: { machine, maintenanceHistory } });
    } catch (error) { next(error); }
};

// POST create machine record
const createMachinery = async (req, res, next) => {
    try {
        const { name, branch, purchaseDate, purchaseCost, condition, description, warrantyExpiry } = req.body;

        if (!name || !branch || !condition)
            return res.status(400).json({ success: false, message: 'name, branch and condition are required.' });

        const machine = await Machinery.create({ name: name.trim(), branch, purchaseDate, purchaseCost, condition, description, warrantyExpiry });
        const populated = await Machinery.findById(machine._id).populate('branch', 'name city');
        return res.status(201).json({ success: true, message: `"${machine.name}" added.`, data: populated });
    } catch (error) { next(error); }
};

// PUT update machine
const updateMachinery = async (req, res, next) => {
    try {
        const { name, branch, purchaseDate, purchaseCost, condition, description, isActive, warrantyExpiry } = req.body;
        const updateData = {};
        if (name           !== undefined) updateData.name           = name.trim();
        if (branch         !== undefined) updateData.branch         = branch;
        if (purchaseDate   !== undefined) updateData.purchaseDate   = purchaseDate;
        if (purchaseCost   !== undefined) updateData.purchaseCost   = purchaseCost;
        if (condition      !== undefined) updateData.condition      = condition;
        if (description    !== undefined) updateData.description    = description;
        if (isActive       !== undefined) updateData.isActive       = isActive;
        if (warrantyExpiry !== undefined) updateData.warrantyExpiry = warrantyExpiry;

        const machine = await Machinery.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
            .populate('branch', 'name city');
        if (!machine)
            return res.status(404).json({ success: false, message: 'Machinery not found.' });
        return res.status(200).json({ success: true, message: `"${machine.name}" updated.`, data: machine });
    } catch (error) { next(error); }
};

// DELETE machine
const deleteMachinery = async (req, res, next) => {
    try {
        const machine = await Machinery.findByIdAndDelete(req.params.id);
        if (!machine)
            return res.status(404).json({ success: false, message: 'Machinery not found.' });
        // Also delete all related maintenance records
        await MaintenanceRecord.deleteMany({ machinery: req.params.id });
        return res.status(200).json({ success: true, message: `"${machine.name}" and its maintenance records deleted.`, data: null });
    } catch (error) { next(error); }
};

// ── MAINTENANCE RECORD CRUD ──────────────────────────────────────────────────

// POST log a maintenance record for a machine
const addMaintenanceRecord = async (req, res, next) => {
    try {
        const { description, cost, date, status, conductedBy, notes } = req.body;
        const machineryId = req.params.id; // machine ID from URL: /api/machinery/:id/maintenance

        if (!description || !status)
            return res.status(400).json({ success: false, message: 'description and status are required.' });

        const record = await MaintenanceRecord.create({ machinery: machineryId, description, cost, date: date || Date.now(), status, conductedBy, notes });

        // Optionally update machine condition if status reflects it
        if (status === 'inprogress') await Machinery.findByIdAndUpdate(machineryId, { condition: 'maintenance' });
        if (status === 'completed')  await Machinery.findByIdAndUpdate(machineryId, { condition: 'good' });

        return res.status(201).json({ success: true, message: 'Maintenance record logged.', data: record });
    } catch (error) { next(error); }
};

// PUT update a maintenance record status
const updateMaintenanceRecord = async (req, res, next) => {
    try {
        const { status, cost, conductedBy, notes } = req.body;
        const updateData = {};
        if (status      !== undefined) updateData.status      = status;
        if (cost        !== undefined) updateData.cost        = cost;
        if (conductedBy !== undefined) updateData.conductedBy = conductedBy;
        if (notes       !== undefined) updateData.notes       = notes;

        const record = await MaintenanceRecord.findByIdAndUpdate(req.params.recordId, updateData, { new: true, runValidators: true });
        if (!record)
            return res.status(404).json({ success: false, message: 'Maintenance record not found.' });

        // Sync machine condition when maintenance completes
        if (status === 'completed') await Machinery.findByIdAndUpdate(record.machinery, { condition: 'good' });

        return res.status(200).json({ success: true, message: 'Maintenance record updated.', data: record });
    } catch (error) { next(error); }
};

module.exports = {
    getAllMachinery, getSingleMachinery, createMachinery, updateMachinery, deleteMachinery,
    addMaintenanceRecord, updateMaintenanceRecord,
};

/*
 * END OF FILE SUMMARY
 * File: controllers/machineryController.js
 * GET    /api/machinery                          → getAllMachinery (?branch ?condition ?isActive)
 * GET    /api/machinery/:id                      → getSingleMachinery (+ maintenance history)
 * POST   /api/machinery                          → createMachinery
 * PUT    /api/machinery/:id                      → updateMachinery
 * DELETE /api/machinery/:id                      → deleteMachinery (+ all maintenance records)
 * POST   /api/machinery/:id/maintenance          → addMaintenanceRecord (auto-updates condition)
 * PUT    /api/machinery/:id/maintenance/:recordId→ updateMaintenanceRecord
 * All Admin/Manager only.
 */
