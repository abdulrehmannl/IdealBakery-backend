const mongoose = require('mongoose');

const counterSalesSchema = new mongoose.Schema({

  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  items: [
    {
      product: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product', 
        required: true 
      },
      quantity: { 
        type: Number, 
        required: true,
        min: 1
      },
      price: { 
        type: Number, 
        required: true 
      }
    }
  ],
  saleDate: { type: Date, default: Date.now },
  customerName: { type: String },
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cash', 'card', 'online'], required: true },
  notes: { type: String }

}, { timestamps: true });

module.exports = mongoose.model('CounterSales', counterSalesSchema);