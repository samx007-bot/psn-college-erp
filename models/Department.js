const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  hod: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  faculty: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  totalSemesters: {
    type: Number,
    default: 8,
    min: 1,
    max: 10
  },
  isActive: {
    type: Boolean,
    default: true
  },
  establishedYear: Number,
  
  // Contact Information
  office: {
    building: String,
    floor: String,
    roomNumber: String,
    phone: String,
    email: String
  },
  
  // Academic Information
  accreditation: {
    body: String,
    grade: String,
    validUntil: Date
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Add pagination plugin
departmentSchema.plugin(mongoosePaginate);

// Indexes
departmentSchema.index({ code: 1 });
departmentSchema.index({ name: 1 });
departmentSchema.index({ isActive: 1 });

module.exports = mongoose.model('Department', departmentSchema);