const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  weight: { type: String },
  stock: { type: Number, default: 0  },
  tags: [String],
  isAvailable: { type: Boolean, default: true },
  isSugarFree: { type: Boolean, default: false },
  image: { type: String },
  category: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category',
    required: true
},
  branch: { 
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],
    validate: v => v.length > 0  // minnimum 1 branch for each product
}


}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
