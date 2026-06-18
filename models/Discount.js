const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  discountType: { type: String, enum: ['percentage', 'flat'], required: true },
  value: { type: Number, required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isActive: { type: Boolean,  default: true }

}, { timestamps: true });

module.exports = mongoose.model('Discount', discountSchema);