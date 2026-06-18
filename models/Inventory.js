const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({

  name: { type: String, required: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch',  required: true },
  unit: { type: String, enum: ['kg', 'ltr', 'pcs', 'grams'], required: true },
  quantity: { type: Number, required: true },
  minStock: { type: Number },
  costPerUnit: { type: Number },
  lastUpdated: {type: Date, default: Date.now }

}, { timestamps: true });

inventorySchema.index({ name: 1, branch: 1 }, { unique: true });  // without it, one item 
module.exports = mongoose.model('Inventory', inventorySchema);