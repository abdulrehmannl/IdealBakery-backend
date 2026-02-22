const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({

  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  role: { type: String, enum: ['chef', 'cashier', 'manager', 'delivery', 'cleaner', 'waiter'], required: true },
  salary: { type: Number, required: true },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  joiningDate: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  address: { type: String }

}, { timestamps: true });

module.exports = mongoose.model('Staff', staffSchema);