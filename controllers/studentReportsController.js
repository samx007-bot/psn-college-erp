const { User, Attendance, Grade, Subject, AcademicYear } = require('../models');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const {
  calculateStudentPerformance,
  generateReportCard,
  checkAttendanceEligibility,
  generateAcademicAlerts
} = require('../utils/studentUtils');

// @desc    Get student performance summary
// @route   GET /api/students/:id/performance
// @access  Faculty, Admin, Own Student
const getStudentPerformance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { academicYear, semester } = req.query;

  // Verify student exists and access permission
  const student = await User.findOne({ _id: id, role: 'student' });
  if (!student) {
    throw new AppError('Student not found', 404);
  }

  if (req.user.role === 'student' && student._id.toString() !== req.user._id.toString()) {
    throw new AppError('Access denied', 403);
  }

  // Get current academic info if not provided
  const currentAcademicYear = academicYear || (await AcademicYear.getCurrentAcademicYear())?.year;
  const currentSemester = semester ? parseInt(semester) : student.studentInfo.semester;

  const performance = await calculateStudentPerformance(
    id,
    currentAcademicYear,
    currentSemester
  );

  res.status(200).json({
    success: true,
    data: {
      studentId: id,
      academicYear: currentAcademicYear,
      semester: currentSemester,
      performance
    }
  });
});

// @desc    Generate student report card
// @route   GET /api/students/:id/report-card
// @access  Faculty, Admin, Own Student
const getStudentReportCard = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { academicYear, semester } = req.query;

  // Verify student exists and access permission
  const student = await User.findOne({ _id: id, role: 'student' });
  if (!student) {
    throw new AppError('Student not found', 404);
  }

  if (req.user.role === 'student' && student._id.toString() !== req.user._id.toString()) {
    throw new AppError('Access denied', 403);
  }

  if (!academicYear || !semester) {
    throw new AppError('Academic year and semester are required', 400);
  }

  const reportCard = await generateReportCard(
    id,
    academicYear,
    parseInt(semester)
  );

  res.status(200).json({
    success: true,
    data: reportCard
  });
});

// @desc    Check attendance eligibility for exams
// @route   GET /api/students/:id/eligibility
// @access  Faculty, Admin, Own Student
const checkStudentEligibility = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { academicYear, semester } = req.query;

  // Verify student exists and access permission
  const student = await User.findOne({ _id: id, role: 'student' });
  if (!student) {
    throw new AppError('Student not found', 404);
  }

  if (req.user.role === 'student' && student._id.toString() !== req.user._id.toString()) {
    throw new AppError('Access denied', 403);
  }

  // Get current academic info if not provided
  const currentAcademicYear = academicYear || (await AcademicYear.getCurrentAcademicYear())?.year;
  const currentSemester = semester ? parseInt(semester) : student.studentInfo.semester;

  const eligibility = await checkAttendanceEligibility(
    id,
    currentAcademicYear,
    currentSemester
  );

  res.status(200).json({
    success: true,
    data: {
      studentId: id,
      academicYear: currentAcademicYear,
      semester: currentSemester,
      eligibility
    }
  });
});

// @desc    Get student academic alerts
// @route   GET /api/students/:id/alerts
// @access  Faculty, Admin, Own Student
const getStudentAlerts = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { academicYear, semester } = req.query;

  // Verify student exists and access permission
  const student = await User.findOne({ _id: id, role: 'student' });
  if (!student) {
    throw new AppError('Student not found', 404);
  }

  if (req.user.role === 'student' && student._id.toString() !== req.user._id.toString()) {
    throw new AppError('Access denied', 403);
  }

  // Get current academic info if not provided
  const currentAcademicYear = academicYear || (await AcademicYear.getCurrentAcademicYear())?.year;
  const currentSemester = semester ? parseInt(semester) : student.studentInfo.semester;

  const alerts = await generateAcademicAlerts(
    id,
    currentAcademicYear,
    currentSemester
  );

  res.status(200).json({
    success: true,
    data: {
      studentId: id,
      academicYear: currentAcademicYear,
      semester: currentSemester,
      alerts,
      alertCount: alerts.length,
      hasHighPriorityAlerts: alerts.some(alert => alert.severity === 'high')
    }
  });
});

// @desc    Get student's class schedule
// @route   GET /api/students/:id/schedule
// @access  Faculty, Admin, Own Student
const getStudentSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { academicYear, semester, day } = req.query;

  // Verify student exists and access permission
  const student = await User.findOne({ _id: id, role: 'student' })
    .populate('studentInfo.department');
  
  if (!student) {
    throw new AppError('Student not found', 404);
  }

  if (req.user.role === 'student' && student._id.toString() !== req.user._id.toString()) {
    throw new AppError('Access denied', 403);
  }

  // Get current academic info if not provided
  const currentAcademicYear = academicYear || student.studentInfo.academicYear;
  const currentSemester = semester ? parseInt(semester) : student.studentInfo.semester;

  // Find subjects for the student's department and semester
  const filter = {
    department: student.studentInfo.department._id,
    semester: currentSemester,
    academicYear: currentAcademicYear,
    isActive: true
  };

  const subjects = await Subject.find(filter)
    .populate('faculty.theory', 'firstName lastName')
    .populate('faculty.practical', 'firstName lastName');

  // Build schedule
  const schedule = {};
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  if (day) {
    // Get schedule for specific day
    schedule[day] = [];
    subjects.forEach(subject => {
      const daySchedule = subject.schedule.filter(s => s.day === day.toLowerCase());
      daySchedule.forEach(slot => {
        schedule[day].push({
          subject: {
            id: subject._id,
            name: subject.name,
            code: subject.code,
            type: subject.type
          },
          faculty: slot.type === 'practical' ? subject.faculty.practical : subject.faculty.theory,
          startTime: slot.startTime,
          endTime: slot.endTime,
          type: slot.type,
          venue: slot.venue
        });
      });
    });

    // Sort by start time
    schedule[day].sort((a, b) => {
      return a.startTime.localeCompare(b.startTime);
    });
  } else {
    // Get full week schedule
    days.forEach(dayName => {
      schedule[dayName] = [];
      subjects.forEach(subject => {
        const daySchedule = subject.schedule.filter(s => s.day === dayName);
        daySchedule.forEach(slot => {
          schedule[dayName].push({
            subject: {
              id: subject._id,
              name: subject.name,
              code: subject.code,
              type: subject.type
            },
            faculty: slot.type === 'practical' ? subject.faculty.practical : subject.faculty.theory,
            startTime: slot.startTime,
            endTime: slot.endTime,
            type: slot.type,
            venue: slot.venue
          });
        });
      });

      // Sort by start time
      schedule[dayName].sort((a, b) => {
        return a.startTime.localeCompare(b.startTime);
      });
    });
  }

  res.status(200).json({
    success: true,
    data: {
      studentId: id,
      department: student.studentInfo.department.name,
      semester: currentSemester,
      academicYear: currentAcademicYear,
      schedule
    }
  });
});

// @desc    Get student's subjects
// @route   GET /api/students/:id/subjects
// @access  Faculty, Admin, Own Student
const getStudentSubjects = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { academicYear, semester } = req.query;

  // Verify student exists and access permission
  const student = await User.findOne({ _id: id, role: 'student' })
    .populate('studentInfo.department');
  
  if (!student) {
    throw new AppError('Student not found', 404);
  }

  if (req.user.role === 'student' && student._id.toString() !== req.user._id.toString()) {
    throw new AppError('Access denied', 403);
  }

  // Get current academic info if not provided
  const currentAcademicYear = academicYear || student.studentInfo.academicYear;
  const currentSemester = semester ? parseInt(semester) : student.studentInfo.semester;

  // Find subjects for the student
  const subjects = await Subject.find({
    department: student.studentInfo.department._id,
    semester: currentSemester,
    academicYear: currentAcademicYear,
    isActive: true
  })
  .populate('faculty.theory', 'firstName lastName')
  .populate('faculty.practical', 'firstName lastName')
  .sort({ name: 1 });

  // Get attendance and grade summary for each subject
  const subjectsWithStats = await Promise.all(
    subjects.map(async (subject) => {
      // Get attendance percentage
      const attendanceStats = await Attendance.calculateAttendancePercentage(
        id,
        subject._id
      );

      // Get recent grades
      const recentGrades = await Grade.find({
        student: id,
        subject: subject._id,
        status: 'published'
      })
      .sort({ assessmentDate: -1 })
      .limit(3);

      return {
        id: subject._id,
        name: subject.name,
        code: subject.code,
        type: subject.type,
        credits: subject.credits,
        faculty: {
          theory: subject.faculty.theory,
          practical: subject.faculty.practical
        },
        attendance: {
          percentage: attendanceStats[0]?.attendancePercentage || 0,
          totalClasses: attendanceStats[0]?.totalClasses || 0,
          presentClasses: attendanceStats[0]?.presentClasses || 0
        },
        recentGrades: recentGrades.map(grade => ({
          type: grade.assessmentType,
          name: grade.assessmentName,
          percentage: grade.percentage,
          grade: grade.grade,
          date: grade.assessmentDate
        }))
      };
    })
  );

  res.status(200).json({
    success: true,
    data: {
      studentId: id,
      department: student.studentInfo.department.name,
      semester: currentSemester,
      academicYear: currentAcademicYear,
      subjects: subjectsWithStats,
      totalSubjects: subjectsWithStats.length,
      totalCredits: subjectsWithStats.reduce((sum, s) => sum + s.credits.total, 0)
    }
  });
});

module.exports = {
  getStudentPerformance,
  getStudentReportCard,
  checkStudentEligibility,
  getStudentAlerts,
  getStudentSchedule,
  getStudentSubjects
};