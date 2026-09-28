const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const leaveSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Leave Type
  leaveType: {
    type: String,
    enum: ['sick', 'personal', 'emergency', 'family', 'medical', 'academic', 'other'],
    required: true
  },
  
  // Leave Period
  fromDate: {
    type: Date,
    required: true
  },
  toDate: {
    type: Date,
    required: true
  },
  totalDays: {
    type: Number,
    required: true
  },
  
  // Application Details
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  // Supporting Documents
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    mimeType: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Application Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  
  // Approval Details
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  reviewComments: String,
  
  // Faculty Recommendations (multiple levels)
  approvalWorkflow: [{
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approverRole: {
      type: String,
      enum: ['class_teacher', 'hod', 'dean', 'principal']
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    comments: String,
    actionDate: Date,
    order: Number
  }],
  
  // Contact Information during leave
  contactDuringLeave: {
    phone: String,
    address: String,
    emergencyContact: String
  },
  
  // Academic Impact
  affectedSubjects: [{
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject'
    },
    missedClasses: Number,
    compensationPlan: String
  }],
  
  // Previous Leave History (for reference)
  leaveBalance: {
    totalAllowed: Number,
    usedThisYear: Number,
    remaining: Number
  },
  
  // Academic Information
  academicYear: {
    type: String,
    required: true
  },
  semester: {
    type: Number,
    required: true
  },
  
  // System fields
  applicationDate: {
    type: Date,
    default: Date.now
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  
  // Notification tracking
  notifications: [{
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['application', 'approval', 'rejection', 'reminder']
    },
    sent: {
      type: Boolean,
      default: false
    },
    sentAt: Date
  }]
}, {
  timestamps: true
});

// Add pagination plugin
leaveSchema.plugin(mongoosePaginate);

// Indexes
leaveSchema.index({ student: 1, status: 1 });
leaveSchema.index({ fromDate: 1, toDate: 1 });
leaveSchema.index({ status: 1, applicationDate: 1 });
leaveSchema.index({ reviewedBy: 1 });
leaveSchema.index({ academicYear: 1, semester: 1 });

// Calculate total days before saving
leaveSchema.pre('save', function(next) {
  if (this.isModified('fromDate') || this.isModified('toDate')) {
    const timeDiff = new Date(this.toDate) - new Date(this.fromDate);
    this.totalDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;
  }
  next();
});

// Static method to get leave statistics
leaveSchema.statics.getLeaveStatistics = async function(studentId, academicYear) {
  return await this.aggregate([
    {
      $match: {
        student: new mongoose.Types.ObjectId(studentId),
        academicYear: academicYear,
        status: { $in: ['approved', 'pending'] }
      }
    },
    {
      $group: {
        _id: '$leaveType',
        totalApplications: { $sum: 1 },
        totalDays: { $sum: '$totalDays' },
        approved: {
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        },
        pending: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        rejected: {
          $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
        }
      }
    }
  ]);
};

// Get pending approvals for a faculty member
leaveSchema.statics.getPendingApprovals = async function(facultyId) {
  return await this.find({
    'approvalWorkflow.approver': facultyId,
    'approvalWorkflow.status': 'pending'
  })
  .populate('student', 'firstName lastName studentInfo.rollNumber')
  .populate('approvalWorkflow.approver', 'firstName lastName')
  .sort({ applicationDate: 1 });
};

module.exports = mongoose.model('Leave', leaveSchema);