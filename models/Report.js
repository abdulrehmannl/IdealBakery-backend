const mongoose = require('mongoose');

const reportsSchema = new mongoose.Schema({

  title: { type: String, required: true },
  type: {
    type: String,
    enum: ['sales', 'attendance', 'inventory', 'salary'],
    required: true
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  dateFrom: { type: Date, required: true },
  dateTo: { type: Date, required: true },
  summary: { type: String},
  data: { type: mongoose.Schema.Types.Mixed }

}, { timestamps: true });

module.exports = mongoose.model('Reports', reportsSchema);