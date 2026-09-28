const { User, Grade, Subject, AcademicYear } = require('../models');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// @desc    Add grades for students
// @route   POST /api/faculty/grades
// @access  Faculty
const addGrades = asyncHandler(async (req, res) => {
  const {
    subjectId,
    assessmentType,
    assessmentName,
    maxMarks,
    assessmentDate,
    weightage = 1,
    grades // Array of {studentId, obtainedMarks, remarks}
  } = req.body;

  // Verify faculty teaches this subject
  const subject = await Subject.findById(subjectId);
  if (!subject) {
    throw new AppError('Subject not found', 404);
  }

  const facultyId = req.user._id.toString();
  const teachesSubject = subject.faculty.theory?.toString() === facultyId || 
                        subject.faculty.practical?.toString() === facultyId;

  if (!teachesSubject) {
    throw new AppError('You are not authorized to add grades for this subject', 403);
  }

  // Get academic year info
  const academicYear = await AcademicYear.getCurrentAcademicYear();

  const gradeRecords = [];
  const errors = [];

  // Process each student's grade
  for (const gradeData of grades) {
    try {
      // Validate marks
      if (gradeData.obtainedMarks > maxMarks) {
        errors.push({
          studentId: gradeData.studentId,
          error: 'Obtained marks cannot exceed maximum marks'
        });
        continue;
      }

      // Check if grade already exists for this assessment
      const existingGrade = await Grade.findOne({
        student: gradeData.studentId,
        subject: subjectId,
        assessmentType,
        assessmentName,
        faculty: req.user._id
      });

      if (existingGrade && existingGrade.status === 'published') {
        errors.push({
          studentId: gradeData.studentId,
          error: 'Grade already published for this assessment'
        });
        continue;
      }

      if (existingGrade) {
        // Update existing draft grade
        existingGrade.obtainedMarks = gradeData.obtainedMarks;
        existingGrade.maxMarks = maxMarks;
        existingGrade.weightage = weightage;
        existingGrade.assessmentDate = new Date(assessmentDate);
        existingGrade.remarks = gradeData.remarks || '';
        existingGrade.questionWiseMarks = gradeData.questionWiseMarks || [];
        existingGrade.evaluatedBy = req.user._id;
        existingGrade.evaluatedAt = new Date();

        await existingGrade.save();
        gradeRecords.push(existingGrade);
      } else {
        // Create new grade record
        const gradeRecord = new Grade({
          student: gradeData.studentId,
          subject: subjectId,
          faculty: req.user._id,
          academicYear: academicYear?.year || new Date().getFullYear().toString(),
          semester: subject.semester,
          assessmentType,
          assessmentName,
          maxMarks,
          obtainedMarks: gradeData.obtainedMarks,
          weightage,
          assessmentDate: new Date(assessmentDate),
          remarks: gradeData.remarks || '',
          questionWiseMarks: gradeData.questionWiseMarks || [],
          evaluatedBy: req.user._id,
          evaluatedAt: new Date(),
          status: 'draft'
        });

        await gradeRecord.save();
        gradeRecords.push(gradeRecord);
      }
    } catch (error) {
      errors.push({
        studentId: gradeData.studentId,
        error: error.message
      });
    }
  }

  // Calculate statistics
  const totalStudents = grades.length;
  const averageMarks = gradeRecords.length > 0 
    ? Math.round(gradeRecords.reduce((sum, g) => sum + g.obtainedMarks, 0) / gradeRecords.length * 100) / 100
    : 0;
  const averagePercentage = gradeRecords.length > 0 
    ? Math.round(gradeRecords.reduce((sum, g) => sum + g.percentage, 0) / gradeRecords.length * 100) / 100
    : 0;

  const gradeDistribution = {
    O: gradeRecords.filter(g => g.grade === 'O').length,
    'A+': gradeRecords.filter(g => g.grade === 'A+').length,
    'A': gradeRecords.filter(g => g.grade === 'A').length,
    'B+': gradeRecords.filter(g => g.grade === 'B+').length,
    'B': gradeRecords.filter(g => g.grade === 'B').length,
    'C': gradeRecords.filter(g => g.grade === 'C').length,
    'P': gradeRecords.filter(g => g.grade === 'P').length,
    'F': gradeRecords.filter(g => g.grade === 'F').length
  };

  res.status(200).json({
    success: true,
    message: `Grades added successfully for ${gradeRecords.length} students`,
    data: {
      subjectId,
      assessmentName,
      assessmentType,
      statistics: {
        totalStudents,
        gradesProcessed: gradeRecords.length,
        averageMarks,
        averagePercentage,
        gradeDistribution,
        passPercentage: Math.round((gradeRecords.length - gradeDistribution.F) / gradeRecords.length * 100)
      },
      errors: errors.length > 0 ? errors : undefined
    }
  });
});

// @desc    Get grades for a subject
// @route   GET /api/faculty/grades/:subjectId
// @access  Faculty
const getSubjectGrades = asyncHandler(async (req, res) => {
  const { subjectId } = req.params;
  const { assessmentType, status = 'published', page = 1, limit = 50 } = req.query;

  // Verify faculty teaches this subject
  const subject = await Subject.findById(subjectId)
    .populate('department', 'name code');

  if (!subject) {
    throw new AppError('Subject not found', 404);
  }

  const facultyId = req.user._id.toString();
  const teachesSubject = subject.faculty.theory?.toString() === facultyId || 
                        subject.faculty.practical?.toString() === facultyId;

  if (!teachesSubject) {
    throw new AppError('You are not authorized to view grades for this subject', 403);
  }

  // Build filter
  const filter = {
    subject: subjectId,
    faculty: req.user._id,
    status
  };

  if (assessmentType) {
    filter.assessmentType = assessmentType;
  }

  // Get grades
  const grades = await Grade.find(filter)
    .populate('student', 'firstName lastName studentInfo.rollNumber')
    .sort({ assessmentDate: -1, 'student.studentInfo.rollNumber': 1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const totalRecords = await Grade.countDocuments(filter);

  // Get assessment summary
  const assessmentTypes = await Grade.distinct('assessmentType', {
    subject: subjectId,
    faculty: req.user._id
  });

  res.status(200).json({
    success: true,
    data: {
      subject: {
        id: subject._id,
        name: subject.name,
        code: subject.code,
        department: subject.department.name,
        semester: subject.semester
      },
      grades,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
        limit: parseInt(limit)
      },
      assessmentTypes
    }
  });
});

// @desc    Publish grades
// @route   PUT /api/faculty/grades/:subjectId/publish
// @access  Faculty
const publishGrades = asyncHandler(async (req, res) => {
  const { subjectId } = req.params;
  const { assessmentType, assessmentName } = req.body;

  // Verify faculty teaches this subject
  const subject = await Subject.findById(subjectId);
  if (!subject) {
    throw new AppError('Subject not found', 404);
  }

  const facultyId = req.user._id.toString();
  const teachesSubject = subject.faculty.theory?.toString() === facultyId || 
                        subject.faculty.practical?.toString() === facultyId;

  if (!teachesSubject) {
    throw new AppError('You are not authorized to publish grades for this subject', 403);
  }

  // Find and update grades
  const filter = {
    subject: subjectId,
    faculty: req.user._id,
    status: 'draft'
  };

  if (assessmentType) filter.assessmentType = assessmentType;
  if (assessmentName) filter.assessmentName = assessmentName;

  const updateResult = await Grade.updateMany(
    filter,
    {
      status: 'published',
      publishedAt: new Date()
    }
  );

  res.status(200).json({
    success: true,
    message: `${updateResult.modifiedCount} grades published successfully`,
    data: {
      gradesPublished: updateResult.modifiedCount
    }
  });
});

// @desc    Update single grade
// @route   PUT /api/faculty/grades/:gradeId
// @access  Faculty
const updateGrade = asyncHandler(async (req, res) => {
  const { gradeId } = req.params;
  const { 
    obtainedMarks, 
    maxMarks, 
    remarks, 
    questionWiseMarks,
    reason 
  } = req.body;

  const grade = await Grade.findById(gradeId)
    .populate('subject', 'name code faculty');

  if (!grade) {
    throw new AppError('Grade record not found', 404);
  }

  // Verify faculty owns this grade record
  if (grade.faculty.toString() !== req.user._id.toString()) {
    throw new AppError('You can only update your own grade records', 403);
  }

  // Check if grade is locked
  if (grade.isLocked) {
    throw new AppError('This grade is locked and cannot be modified', 403);
  }

  // Store previous values for history
  const previousMarks = grade.obtainedMarks;
  const previousGrade = grade.grade;

  // Update the record
  if (obtainedMarks !== undefined) {
    if (obtainedMarks > (maxMarks || grade.maxMarks)) {
      throw new AppError('Obtained marks cannot exceed maximum marks', 400);
    }
    grade.obtainedMarks = obtainedMarks;
  }

  if (maxMarks !== undefined) grade.maxMarks = maxMarks;
  if (remarks !== undefined) grade.remarks = remarks;
  if (questionWiseMarks !== undefined) grade.questionWiseMarks = questionWiseMarks;

  // Add to revision history
  grade.revisionHistory.push({
    previousMarks,
    newMarks: grade.obtainedMarks,
    previousGrade,
    newGrade: grade.grade, // This will be calculated by pre-save middleware
    revisedBy: req.user._id,
    revisedAt: new Date(),
    reason: reason || 'Updated by faculty'
  });

  await grade.save();

  res.status(200).json({
    success: true,
    message: 'Grade updated successfully',
    data: {
      grade
    }
  });
});

// @desc    Get grade statistics for subject
// @route   GET /api/faculty/grades/:subjectId/statistics
// @access  Faculty
const getGradeStatistics = asyncHandler(async (req, res) => {
  const { subjectId } = req.params;
  const { assessmentType } = req.query;

  // Verify faculty teaches this subject
  const subject = await Subject.findById(subjectId);
  if (!subject) {
    throw new AppError('Subject not found', 404);
  }

  const facultyId = req.user._id.toString();
  const teachesSubject = subject.faculty.theory?.toString() === facultyId || 
                        subject.faculty.practical?.toString() === facultyId;

  if (!teachesSubject) {
    throw new AppError('You are not authorized to view statistics for this subject', 403);
  }

  // Build filter
  const filter = {
    subject: subjectId,
    faculty: req.user._id,
    status: 'published'
  };

  if (assessmentType) filter.assessmentType = assessmentType;

  // Get grade statistics
  const statistics = await Grade.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalStudents: { $sum: 1 },
        averageMarks: { $avg: '$obtainedMarks' },
        averagePercentage: { $avg: '$percentage' },
        maxMarks: { $max: '$obtainedMarks' },
        minMarks: { $min: '$obtainedMarks' },
        gradeDistribution: {
          $push: '$grade'
        }
      }
    }
  ]);

  let gradeDistribution = {};
  if (statistics.length > 0) {
    const grades = statistics[0].gradeDistribution;
    gradeDistribution = {
      O: grades.filter(g => g === 'O').length,
      'A+': grades.filter(g => g === 'A+').length,
      'A': grades.filter(g => g === 'A').length,
      'B+': grades.filter(g => g === 'B+').length,
      'B': grades.filter(g => g === 'B').length,
      'C': grades.filter(g => g === 'C').length,
      'P': grades.filter(g => g === 'P').length,
      'F': grades.filter(g => g === 'F').length
    };
  }

  // Get assessment-wise statistics
  const assessmentStats = await Grade.aggregate([
    { $match: { subject: subjectId, faculty: req.user._id, status: 'published' } },
    {
      $group: {
        _id: {
          assessmentType: '$assessmentType',
          assessmentName: '$assessmentName'
        },
        totalStudents: { $sum: 1 },
        averagePercentage: { $avg: '$percentage' },
        maxPercentage: { $max: '$percentage' },
        minPercentage: { $min: '$percentage' },
        passCount: {
          $sum: { $cond: [{ $ne: ['$grade', 'F'] }, 1, 0] }
        }
      }
    },
    {
      $addFields: {
        passPercentage: {
          $round: [
            { $multiply: [{ $divide: ['$passCount', '$totalStudents'] }, 100] },
            2
          ]
        }
      }
    },
    { $sort: { '_id.assessmentType': 1, '_id.assessmentName': 1 } }
  ]);

  res.status(200).json({
    success: true,
    data: {
      subject: {
        id: subject._id,
        name: subject.name,
        code: subject.code
      },
      overall: statistics.length > 0 ? {
        totalStudents: statistics[0].totalStudents,
        averageMarks: Math.round(statistics[0].averageMarks * 100) / 100,
        averagePercentage: Math.round(statistics[0].averagePercentage * 100) / 100,
        maxMarks: statistics[0].maxMarks,
        minMarks: statistics[0].minMarks,
        gradeDistribution,
        passPercentage: Math.round((statistics[0].totalStudents - (gradeDistribution.F || 0)) / statistics[0].totalStudents * 100)
      } : null,
      assessmentWise: assessmentStats
    }
  });
});

module.exports = {
  addGrades,
  getSubjectGrades,
  publishGrades,
  updateGrade,
  getGradeStatistics
};