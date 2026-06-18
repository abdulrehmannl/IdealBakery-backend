const mongoose = require('mongoose');

const machinerySchema = new mongoose.Schema({

  name: { type: String, required: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  purchaseDate: { type: Date },
  purchaseCost: { type: Number },
  condition: { type: String, enum: ['good', 'maintenance', 'broken'], required: true },
  description: { type: String },
  isActive: { type: Boolean, default: true },
  warrantyExpiry: { type: Date }
  
}, { timestamps: true });

module.exports = mongoose.model('Machinery', machinerySchema);