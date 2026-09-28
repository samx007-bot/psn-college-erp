const { User, Attendance, Subject, AcademicYear } = require('../models');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// @desc    Mark attendance for a class
// @route   POST /api/faculty/attendance/mark
// @access  Faculty
const markAttendance = asyncHandler(async (req, res) => {
  const {
    subjectId,
    date,
    classType,
    classNumber,
    timeSlot,
    venue,
    attendanceData // Array of {studentId, status, remarks}
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
    throw new AppError('You are not authorized to mark attendance for this subject', 403);
  }

  // Get academic year info
  const academicYear = await AcademicYear.getCurrentAcademicYear();

  const attendanceRecords = [];
  const errors = [];

  // Process each student's attendance
  for (const studentData of attendanceData) {
    try {
      // Check if attendance already marked for this student, subject, and date
      const existingAttendance = await Attendance.findOne({
        student: studentData.studentId,
        subject: subjectId,
        date: new Date(date),
        classType
      });

      if (existingAttendance) {
        // Update existing record
        existingAttendance.status = studentData.status;
        existingAttendance.remarks = studentData.remarks || '';
        existingAttendance.lateMinutes = studentData.lateMinutes || 0;
        existingAttendance.hasModifications = true;
        existingAttendance.modificationHistory.push({
          modifiedBy: req.user._id,
          modifiedAt: new Date(),
          previousStatus: existingAttendance.status,
          newStatus: studentData.status,
          reason: 'Updated by faculty'
        });

        await existingAttendance.save();
        attendanceRecords.push(existingAttendance);
      } else {
        // Create new attendance record
        const attendanceRecord = new Attendance({
          student: studentData.studentId,
          subject: subjectId,
          faculty: req.user._id,
          date: new Date(date),
          status: studentData.status,
          classType,
          classNumber,
          timeSlot,
          venue,
          remarks: studentData.remarks || '',
          lateMinutes: studentData.lateMinutes || 0,
          markedBy: req.user._id,
          academicYear: academicYear?.year || new Date().getFullYear().toString(),
          semester: subject.semester
        });

        await attendanceRecord.save();
        attendanceRecords.push(attendanceRecord);
      }
    } catch (error) {
      errors.push({
        studentId: studentData.studentId,
        error: error.message
      });
    }
  }

  // Get updated statistics
  const totalStudents = attendanceData.length;
  const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
  const absentCount = attendanceRecords.filter(r => r.status === 'absent').length;
  const lateCount = attendanceRecords.filter(r => r.status === 'late').length;

  res.status(200).json({
    success: true,
    message: `Attendance marked successfully for ${attendanceRecords.length} students`,
    data: {
      subjectId,
      date,
      classType,
      statistics: {
        totalStudents,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        attendancePercentage: Math.round((presentCount + lateCount) / totalStudents * 100)
      },
      recordsProcessed: attendanceRecords.length,
      errors: errors.length > 0 ? errors : undefined
    }
  });
});

// @desc    Get attendance for a specific class
// @route   GET /api/faculty/attendance/:subjectId
// @access  Faculty
const getClassAttendance = asyncHandler(async (req, res) => {
  const { subjectId } = req.params;
  const { date, classType, page = 1, limit = 50 } = req.query;

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
    throw new AppError('You are not authorized to view attendance for this subject', 403);
  }

  // Build filter
  const filter = {
    subject: subjectId,
    faculty: req.user._id
  };

  if (date) {
    const queryDate = new Date(date);
    filter.date = {
      $gte: new Date(queryDate.setHours(0, 0, 0, 0)),
      $lte: new Date(queryDate.setHours(23, 59, 59, 999))
    };
  }

  if (classType) {
    filter.classType = classType;
  }

  // Get attendance records
  const attendance = await Attendance.find(filter)
    .populate('student', 'firstName lastName studentInfo.rollNumber')
    .sort({ date: -1, 'student.studentInfo.rollNumber': 1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const totalRecords = await Attendance.countDocuments(filter);

  // Get class statistics if specific date is provided
  let classStats = null;
  if (date && classType) {
    const classAttendance = await Attendance.find({
      subject: subjectId,
      date: {
        $gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
        $lte: new Date(new Date(date).setHours(23, 59, 59, 999))
      },
      classType
    });

    const totalStudents = classAttendance.length;
    const presentCount = classAttendance.filter(a => a.status === 'present').length;
    const absentCount = classAttendance.filter(a => a.status === 'absent').length;
    const lateCount = classAttendance.filter(a => a.status === 'late').length;

    classStats = {
      totalStudents,
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      attendancePercentage: totalStudents > 0 ? Math.round((presentCount + lateCount) / totalStudents * 100) : 0
    };
  }

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
      attendance,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
        limit: parseInt(limit)
      },
      classStats
    }
  });
});

// @desc    Get attendance summary for subject
// @route   GET /api/faculty/attendance/:subjectId/summary
// @access  Faculty
const getAttendanceSummary = asyncHandler(async (req, res) => {
  const { subjectId } = req.params;
  const { fromDate, toDate } = req.query;

  // Verify faculty teaches this subject
  const subject = await Subject.findById(subjectId);
  if (!subject) {
    throw new AppError('Subject not found', 404);
  }

  const facultyId = req.user._id.toString();
  const teachesSubject = subject.faculty.theory?.toString() === facultyId || 
                        subject.faculty.practical?.toString() === facultyId;

  if (!teachesSubject) {
    throw new AppError('You are not authorized to view attendance for this subject', 403);
  }

  // Build date filter
  let dateFilter = {};
  if (fromDate && toDate) {
    dateFilter = {
      $gte: new Date(fromDate),
      $lte: new Date(toDate)
    };
  }

  // Get students enrolled in this subject
  const students = await User.find({
    role: 'student',
    'studentInfo.department': subject.department,
    'studentInfo.semester': subject.semester,
    'studentInfo.academicYear': subject.academicYear,
    isActive: true
  })
  .select('firstName lastName studentInfo.rollNumber')
  .sort({ 'studentInfo.rollNumber': 1 });

  // Get attendance summary for each student
  const attendanceSummary = await Promise.all(
    students.map(async (student) => {
      const filter = {
        student: student._id,
        subject: subjectId,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter })
      };

      const totalClasses = await Attendance.countDocuments(filter);
      const presentClasses = await Attendance.countDocuments({
        ...filter,
        status: { $in: ['present', 'late'] }
      });
      const absentClasses = await Attendance.countDocuments({
        ...filter,
        status: 'absent'
      });

      const attendancePercentage = totalClasses > 0 
        ? Math.round((presentClasses / totalClasses) * 100 * 100) / 100 
        : 0;

      return {
        student: {
          id: student._id,
          name: `${student.firstName} ${student.lastName}`,
          rollNumber: student.studentInfo.rollNumber
        },
        totalClasses,
        presentClasses,
        absentClasses,
        attendancePercentage,
        isShortAttendance: attendancePercentage < (subject.attendanceConfig?.minimumPercentage || 75)
      };
    })
  );

  // Calculate class-wise statistics
  const classStats = await Attendance.aggregate([
    {
      $match: {
        subject: subject._id,
        faculty: req.user._id,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter })
      }
    },
    {
      $group: {
        _id: {
          date: '$date',
          classType: '$classType'
        },
        totalStudents: { $sum: 1 },
        presentCount: {
          $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] }
        },
        absentCount: {
          $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
        }
      }
    },
    {
      $addFields: {
        attendancePercentage: {
          $round: [
            { $multiply: [{ $divide: ['$presentCount', '$totalStudents'] }, 100] },
            2
          ]
        }
      }
    },
    {
      $sort: { '_id.date': -1 }
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      subject: {
        id: subject._id,
        name: subject.name,
        code: subject.code,
        minimumAttendancePercentage: subject.attendanceConfig?.minimumPercentage || 75
      },
      period: {
        fromDate,
        toDate
      },
      studentSummary: attendanceSummary,
      classStats,
      overallStats: {
        totalStudents: attendanceSummary.length,
        studentsWithShortAttendance: attendanceSummary.filter(s => s.isShortAttendance).length,
        averageAttendancePercentage: attendanceSummary.length > 0 
          ? Math.round(attendanceSummary.reduce((sum, s) => sum + s.attendancePercentage, 0) / attendanceSummary.length * 100) / 100
          : 0
      }
    }
  });
});

// @desc    Update single attendance record
// @route   PUT /api/faculty/attendance/:attendanceId
// @access  Faculty
const updateAttendanceRecord = asyncHandler(async (req, res) => {
  const { attendanceId } = req.params;
  const { status, remarks, reason } = req.body;

  const attendance = await Attendance.findById(attendanceId)
    .populate('subject', 'name code faculty');

  if (!attendance) {
    throw new AppError('Attendance record not found', 404);
  }

  // Verify faculty owns this attendance record
  if (attendance.faculty.toString() !== req.user._id.toString()) {
    throw new AppError('You can only update your own attendance records', 403);
  }

  // Store previous status for history
  const previousStatus = attendance.status;

  // Update the record
  attendance.status = status;
  attendance.remarks = remarks || attendance.remarks;
  attendance.hasModifications = true;
  attendance.modificationHistory.push({
    modifiedBy: req.user._id,
    modifiedAt: new Date(),
    previousStatus,
    newStatus: status,
    reason: reason || 'Updated by faculty'
  });

  await attendance.save();

  res.status(200).json({
    success: true,
    message: 'Attendance record updated successfully',
    data: {
      attendance
    }
  });
});

module.exports = {
  markAttendance,
  getClassAttendance,
  getAttendanceSummary,
  updateAttendanceRecord
};