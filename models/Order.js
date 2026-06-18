const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({

  customer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true },
  branch: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Branch'},
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'preparing', 'delivered', 'cancelled'], default: 'pending'},
  paymentMethod: { type: String, enum: ['cash', 'online'], required: true},
  address: { type: String, required: true },
  phone: { type: String, required: true},
  orderType: { type: String, enum: ['delivery', 'pickup'], required: true }

}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);