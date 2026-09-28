const mongoose = require('mongoose');

const academicYearSchema = new mongoose.Schema({
  year: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  
  // Semester Information
  semesters: [{
    semesterNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 8
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    
    // Important Dates
    registrationStartDate: Date,
    registrationEndDate: Date,
    examStartDate: Date,
    examEndDate: Date,
    resultDate: Date,
    
    // Semester Status
    status: {
      type: String,
      enum: ['upcoming', 'active', 'exam_period', 'completed'],
      default: 'upcoming'
    },
    
    // Academic Calendar
    holidays: [{
      name: String,
      date: Date,
      type: {
        type: String,
        enum: ['national', 'festival', 'college', 'exam']
      }
    }],
    
    // Working Days
    workingDays: {
      type: Number,
      default: 0
    },
    totalDays: {
      type: Number,
      default: 0
    }
  }],
  
  // Academic Year Status
  status: {
    type: String,
    enum: ['upcoming', 'current', 'completed'],
    default: 'upcoming'
  },
  
  // Global Holidays for the year
  holidays: [{
    name: String,
    date: Date,
    type: {
      type: String,
      enum: ['national', 'festival', 'college']
    },
    isOptional: {
      type: Boolean,
      default: false
    }
  }],
  
  // Attendance Configuration
  attendanceConfig: {
    minimumPercentage: {
      type: Number,
      default: 75,
      min: 50,
      max: 100
    },
    gracePercentage: {
      type: Number,
      default: 5
    },
    medicalLeavePercentage: {
      type: Number,
      default: 10
    }
  },
  
  // Leave Configuration
  leaveConfig: {
    maxCasualLeave: {
      type: Number,
      default: 12
    },
    maxSickLeave: {
      type: Number,
      default: 15
    },
    maxStudyLeave: {
      type: Number,
      default: 10
    },
    carryForwardLimit: {
      type: Number,
      default: 5
    }
  },
  
  // Fee Structure
  feeStructure: [{
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    },
    semester: Number,
    fees: {
      tuition: Number,
      development: Number,
      library: Number,
      laboratory: Number,
      examination: Number,
      other: Number,
      total: Number
    }
  }],
  
  isActive: {
    type: Boolean,
    default: false
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

// Indexes
academicYearSchema.index({ year: 1 });
academicYearSchema.index({ status: 1 });
academicYearSchema.index({ isActive: 1 });
academicYearSchema.index({ startDate: 1, endDate: 1 });

// Validate dates
academicYearSchema.pre('save', function(next) {
  if (this.endDate <= this.startDate) {
    return next(new Error('End date must be after start date'));
  }
  
  // Validate semester dates
  for (let semester of this.semesters) {
    if (semester.endDate <= semester.startDate) {
      return next(new Error(`Semester ${semester.semesterNumber} end date must be after start date`));
    }
    
    if (semester.startDate < this.startDate || semester.endDate > this.endDate) {
      return next(new Error(`Semester ${semester.semesterNumber} dates must be within academic year dates`));
    }
  }
  
  next();
});

// Static method to get current academic year
academicYearSchema.statics.getCurrentAcademicYear = async function() {
  const currentDate = new Date();
  return await this.findOne({
    startDate: { $lte: currentDate },
    endDate: { $gte: currentDate },
    status: 'current'
  });
};

// Static method to get current semester
academicYearSchema.statics.getCurrentSemester = async function() {
  const currentDate = new Date();
  const academicYear = await this.getCurrentAcademicYear();
  
  if (!academicYear) return null;
  
  const currentSemester = academicYear.semesters.find(sem => 
    sem.startDate <= currentDate && sem.endDate >= currentDate
  );
  
  return currentSemester;
};

module.exports = mongoose.model('AcademicYear', academicYearSchema);