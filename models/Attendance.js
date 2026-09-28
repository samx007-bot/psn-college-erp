const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // Attendance Status
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'excused'],
    required: true
  },
  
  // Class Information
  classType: {
    type: String,
    enum: ['theory', 'practical', 'tutorial'],
    required: true
  },
  classNumber: {
    type: Number,
    required: true
  },
  
  // Time Information
  timeSlot: {
    startTime: String,
    endTime: String
  },
  venue: String,
  
  // Additional Information
  remarks: String,
  lateMinutes: {
    type: Number,
    default: 0
  },
  
  // Marking Information
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  markedAt: {
    type: Date,
    default: Date.now
  },
  
  // Modification tracking
  hasModifications: {
    type: Boolean,
    default: false
  },
  modificationHistory: [{
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    modifiedAt: {
      type: Date,
      default: Date.now
    },
    previousStatus: String,
    newStatus: String,
    reason: String
  }],
  
  // Academic Information
  academicYear: {
    type: String,
    required: true
  },
  semester: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
attendanceSchema.index({ student: 1, subject: 1, date: 1 }, { unique: true });
attendanceSchema.index({ subject: 1, date: 1 });
attendanceSchema.index({ faculty: 1, date: 1 });
attendanceSchema.index({ date: 1, classType: 1 });
attendanceSchema.index({ academicYear: 1, semester: 1 });

// Statics for attendance calculations
attendanceSchema.statics.calculateAttendancePercentage = async function(studentId, subjectId, fromDate, toDate) {
  const pipeline = [
    {
      $match: {
        student: new mongoose.Types.ObjectId(studentId),
        ...(subjectId && { subject: new mongoose.Types.ObjectId(subjectId) }),
        ...(fromDate && toDate && {
          date: {
            $gte: new Date(fromDate),
            $lte: new Date(toDate)
          }
        })
      }
    },
    {
      $group: {
        _id: subjectId ? '$subject' : null,
        totalClasses: { $sum: 1 },
        presentClasses: {
          $sum: {
            $cond: [
              { $in: ['$status', ['present', 'late']] },
              1,
              0
            ]
          }
        },
        absentClasses: {
          $sum: {
            $cond: [{ $eq: ['$status', 'absent'] }, 1, 0]
          }
        }
      }
    },
    {
      $addFields: {
        attendancePercentage: {
          $multiply: [
            { $divide: ['$presentClasses', '$totalClasses'] },
            100
          ]
        }
      }
    }
  ];
  
  return await this.aggregate(pipeline);
};

// Get attendance summary for a student
attendanceSchema.statics.getStudentAttendanceSummary = async function(studentId, academicYear, semester) {
  return await this.aggregate([
    {
      $match: {
        student: new mongoose.Types.ObjectId(studentId),
        academicYear: academicYear,
        semester: semester
      }
    },
    {
      $group: {
        _id: '$subject',
        totalClasses: { $sum: 1 },
        presentClasses: {
          $sum: {
            $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0]
          }
        },
        absentClasses: {
          $sum: {
            $cond: [{ $eq: ['$status', 'absent'] }, 1, 0]
          }
        }
      }
    },
    {
      $lookup: {
        from: 'subjects',
        localField: '_id',
        foreignField: '_id',
        as: 'subject'
      }
    },
    {
      $unwind: '$subject'
    },
    {
      $addFields: {
        attendancePercentage: {
          $round: [
            {
              $multiply: [
                { $divide: ['$presentClasses', '$totalClasses'] },
                100
              ]
            },
            2
          ]
        }
      }
    },
    {
      $project: {
        subjectName: '$subject.name',
        subjectCode: '$subject.code',
        totalClasses: 1,
        presentClasses: 1,
        absentClasses: 1,
        attendancePercentage: 1,
        isShortAttendance: {
          $lt: ['$attendancePercentage', '$subject.attendanceConfig.minimumPercentage']
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Attendance', attendanceSchema);