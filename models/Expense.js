const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  branch: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Branch', 
    required: true },
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  category: {  type: String, 
    enum: ['rent', 'electricity', 'packaging', 'salary', 'other'], required: true },
  date: { type: Date, default: Date.now },
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff',  required: true },
  notes: { type: String }

}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);