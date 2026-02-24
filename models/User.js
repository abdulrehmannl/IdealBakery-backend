const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['customer', 'admin', 'manager', 'cashier'],
    default: 'customer'
},
  email: { type: String, required: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  address: { type: String }

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
