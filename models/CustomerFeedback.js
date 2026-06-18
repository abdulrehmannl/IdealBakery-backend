const mongoose = require('mongoose');

const customerFeedbackSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  name: { type: String },
  message: { type: String, required: true },
  type: { type: String, enum: ['complaint', 'suggestion', 'compliment'], required: true },
  status: { type: String, enum: ['pending', 'reviewed', 'resolved'], default: 'pending' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }

}, { timestamps: true });

module.exports = mongoose.model('CustomerFeedback', customerFeedbackSchema);