const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({

  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  deliveryBoy: {  type: mongoose.Schema.Types.ObjectId,  ref: 'Staff',  required: true },
  status: { type: String, enum: ['assigned', 'picked', 'onway', 'delivered', 'failed'], required: true },
  assignedAt: { type: Date,  default: Date.now },
  deliveredAt: { type: Date },
  address: { type: String, required: true },
  notes: { type: String },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }

}, { timestamps: true });

module.exports = mongoose.model('Delivery', deliverySchema);