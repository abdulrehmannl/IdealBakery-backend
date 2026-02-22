const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({

  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  //date: { type: Date, required: true },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['present', 'absent', 'late', 'halfday'], required: true },
  arrivalTime: { type: String },
  leaveTime: { type: String },
  notes: { type: String
  }

}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
attendanceSchema.index({ staff: 1, date: 1 }, { unique: true });
//This prevents duplicate attendance records for same staff on same day. This is a **professional level** addition — add it!
