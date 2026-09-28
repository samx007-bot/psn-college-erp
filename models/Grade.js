const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
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
  
  // Academic Information
  academicYear: {
    type: String,
    required: true
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  
  // Assessment Details
  assessmentType: {
    type: String,
    enum: ['internal', 'external', 'assignment', 'project', 'practical', 'quiz', 'mid_term', 'final'],
    required: true
  },
  assessmentName: {
    type: String,
    required: true,
    trim: true
  },
  
  // Marks Information
  maxMarks: {
    type: Number,
    required: true,
    min: 0
  },
  obtainedMarks: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Grade Calculation
  percentage: {
    type: Number,
    min: 0,
    max: 100
  },
  grade: {
    type: String,
    enum: ['O', 'A+', 'A', 'B+', 'B', 'C', 'P', 'F', 'Ab', 'I']
  },
  gradePoints: {
    type: Number,
    min: 0,
    max: 10
  },
  
  // Weightage for final calculation
  weightage: {
    type: Number,
    default: 1,
    min: 0
  },
  
  // Assessment Date
  assessmentDate: {
    type: Date,
    required: true
  },
  submissionDate: {
    type: Date,
    default: Date.now
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'published', 'revised'],
    default: 'draft'
  },
  
  // Additional Information
  remarks: String,
  feedback: String,
  
  // Answer Sheet/Assignment Details
  answerSheet: {
    filename: String,
    path: String,
    uploadedAt: Date
  },
  
  // Evaluation Details
  evaluatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  evaluatedAt: Date,
  
  // Question-wise marks (for detailed analysis)
  questionWiseMarks: [{
    questionNumber: Number,
    maxMarks: Number,
    obtainedMarks: Number,
    remarks: String
  }],
  
  // Revision History
  revisionHistory: [{
    previousMarks: Number,
    newMarks: Number,
    previousGrade: String,
    newGrade: String,
    revisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    revisedAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }],
  
  // System fields
  publishedAt: Date,
  isLocked: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound indexes
gradeSchema.index({ student: 1, subject: 1, assessmentType: 1 });
gradeSchema.index({ subject: 1, assessmentDate: 1 });
gradeSchema.index({ academicYear: 1, semester: 1 });
gradeSchema.index({ faculty: 1, assessmentDate: 1 });
gradeSchema.index({ status: 1 });

// Pre-save middleware to calculate percentage and grade
gradeSchema.pre('save', function(next) {
  // Calculate percentage
  if (this.maxMarks > 0) {
    this.percentage = Math.round((this.obtainedMarks / this.maxMarks) * 100 * 100) / 100;
  }
  
  // Calculate grade based on percentage
  if (this.percentage !== undefined) {
    if (this.percentage >= 90) {
      this.grade = 'O';
      this.gradePoints = 10;
    } else if (this.percentage >= 80) {
      this.grade = 'A+';
      this.gradePoints = 9;
    } else if (this.percentage >= 70) {
      this.grade = 'A';
      this.gradePoints = 8;
    } else if (this.percentage >= 60) {
      this.grade = 'B+';
      this.gradePoints = 7;
    } else if (this.percentage >= 50) {
      this.grade = 'B';
      this.gradePoints = 6;
    } else if (this.percentage >= 40) {
      this.grade = 'C';
      this.gradePoints = 5;
    } else if (this.percentage >= 35) {
      this.grade = 'P';
      this.gradePoints = 4;
    } else {
      this.grade = 'F';
      this.gradePoints = 0;
    }
  }
  
  next();
});

// Static method to calculate CGPA
gradeSchema.statics.calculateCGPA = async function(studentId, academicYear, semester) {
  const pipeline = [
    {
      $match: {
        student: new mongoose.Types.ObjectId(studentId),
        academicYear: academicYear,
        ...(semester && { semester: { $lte: semester } }),
        status: 'published'
      }
    },
    {
      $lookup: {
        from: 'subjects',
        localField: 'subject',
        foreignField: '_id',
        as: 'subjectInfo'
      }
    },
    {
      $unwind: '$subjectInfo'
    },
    {
      $group: {
        _id: {
          subject: '$subject',
          semester: '$semester'
        },
        totalMarks: { $sum: { $multiply: ['$obtainedMarks', '$weightage'] } },
        totalMaxMarks: { $sum: { $multiply: ['$maxMarks', '$weightage'] } },
        credits: { $first: '$subjectInfo.credits.total' },
        gradePoints: { $avg: '$gradePoints' }
      }
    },
    {
      $group: {
        _id: null,
        totalCredits: { $sum: '$credits' },
        weightedGradePoints: { $sum: { $multiply: ['$gradePoints', '$credits'] } }
      }
    },
    {
      $project: {
        cgpa: {
          $round: [
            { $divide: ['$weightedGradePoints', '$totalCredits'] },
            2
          ]
        }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result.length > 0 ? result[0].cgpa : 0;
};

// Get subject-wise performance
gradeSchema.statics.getSubjectPerformance = async function(studentId, subjectId, academicYear) {
  return await this.aggregate([
    {
      $match: {
        student: new mongoose.Types.ObjectId(studentId),
        subject: new mongoose.Types.ObjectId(subjectId),
        academicYear: academicYear,
        status: 'published'
      }
    },
    {
      $group: {
        _id: '$assessmentType',
        totalMarks: { $sum: '$obtainedMarks' },
        totalMaxMarks: { $sum: '$maxMarks' },
        averagePercentage: { $avg: '$percentage' },
        assessmentCount: { $sum: 1 }
      }
    },
    {
      $project: {
        assessmentType: '$_id',
        totalMarks: 1,
        totalMaxMarks: 1,
        overallPercentage: {
          $round: [
            { $multiply: [{ $divide: ['$totalMarks', '$totalMaxMarks'] }, 100] },
            2
          ]
        },
        averagePercentage: { $round: ['$averagePercentage', 2] },
        assessmentCount: 1
      }
    }
  ]);
};

module.exports = mongoose.model('Grade', gradeSchema);