const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema({

  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  month: { 
    type: String, 
    enum: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    required: true },
  year: { type: Number, required: true },
  basicSalary: { type: Number, required: true },
  bonus: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  netSalary: { type: Number, required: true },
  paymentDate: { type: Date }, 
  paymentMethod: { type: String, enum: ['cash', 'bank', 'online'] },
  status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  notes: { type: String }

}, { timestamps: true });

// Unique index to prevent duplicate salary records for same staff in same month+year
salarySchema.index({ staff: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Salary', salarySchema);