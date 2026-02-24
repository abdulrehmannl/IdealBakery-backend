const mongoose = require('mongoose');

const maintenanceRecordSchema = new mongoose.Schema({
  machinery: { type: mongoose.Schema.Types.ObjectId,ref: 'Machinery', required: true },
  description: { type: String, required: true },
  cost: { type: Number },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'inprogress', 'completed'], required: true },
  conductedBy: { type: String },
  notes: { type: String }

}, { timestamps: true });

module.exports = mongoose.model('MaintenanceRecord', maintenanceRecordSchema);