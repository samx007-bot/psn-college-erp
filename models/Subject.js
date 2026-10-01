const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
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
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  academicYear: {
    type: String,
    required: true
  },
  
  // Credit Information
  credits: {
    theory: { type: Number, default: 0 },
    practical: { type: Number, default: 0 },
    total: { type: Number, required: true }
  },
  
  // Subject Type
  type: {
    type: String,
    enum: ['core', 'elective', 'practical', 'project'],
    default: 'core'
  },
  
  // Faculty Assignment
  faculty: {
    theory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    practical: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Class Schedule
  schedule: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    },
    startTime: String,
    endTime: String,
    type: {
      type: String,
      enum: ['theory', 'practical', 'tutorial']
    },
    venue: String
  }],
  
  // Syllabus
  syllabus: {
    units: [{
      unitNumber: Number,
      title: String,
      topics: [String],
      hours: Number
    }],
    textbooks: [String],
    references: [String],
    outcomes: [String]
  },
  
  // Attendance Configuration
  attendanceConfig: {
    minimumPercentage: {
      type: Number,
      default: 75,
      min: 0,
      max: 100
    },
    totalClasses: {
      type: Number,
      default: 0
    },
    isAttendanceMandatory: {
      type: Boolean,
      default: true
    }
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // System fields
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
subjectSchema.plugin(mongoosePaginate);

// Compound indexes (unique index on code already defined)
subjectSchema.index({ department: 1, semester: 1 });
subjectSchema.index({ academicYear: 1, semester: 1 });
subjectSchema.index({ 'faculty.theory': 1 });
subjectSchema.index({ 'faculty.practical': 1 });

// Calculate total credits before saving
subjectSchema.pre('save', function(next) {
  this.credits.total = this.credits.theory + this.credits.practical;
  next();
});

module.exports = mongoose.model('Subject', subjectSchema);