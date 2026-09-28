const { Leave, User, AcademicYear, Department } = require('../models');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const {
  calculateLeaveBalance,
  generateLeaveReport,
  checkLeaveEligibility,
  getLeaveCalendar
} = require('../utils/leaveUtils');

// @desc    Get leave balance for student
// @route   GET /api/leave/balance/:studentId?
// @access  Student (own), Faculty, Admin
const getLeaveBalance = asyncHandler(async (req, res) => {
  const studentId = req.params.studentId || req.user._id;
  const { academicYear } = req.query;

  // Check access permissions
  if (req.user.role === 'student' && studentId !== req.user._id.toString()) {
    throw new AppError('Students can only view their own leave balance', 403);
  }

  // Verify student exists
  const student = await User.findOne({ _id: studentId, role: 'student' });
  if (!student) {
    throw new AppError('Student not found', 404);
  }

  const balance = await calculateLeaveBalance(studentId, academicYear);

  res.status(200).json({
    success: true,
    data: {
      studentId,
      studentName: student.fullName,
      rollNumber: student.studentInfo?.rollNumber,
      balance
    }
  });
});

// @desc    Generate leave report for student
// @route   GET /api/leave/report/:studentId?
// @access  Student (own), Faculty, Admin
const getLeaveReport = asyncHandler(async (req, res) => {
  const studentId = req.params.studentId || req.user._id;
  const { academicYear, detailed = 'true' } = req.query;

  // Check access permissions
  if (req.user.role === 'student' && studentId !== req.user._id.toString()) {
    throw new AppError('Students can only view their own leave reports', 403);
  }

  const report = await generateLeaveReport(
    studentId, 
    academicYear, 
    detailed === 'true'
  );

  res.status(200).json({
    success: true,
    data: report
  });
});

// @desc    Check leave eligibility
// @route   POST /api/leave/check-eligibility
// @access  Student
const checkEligibility = asyncHandler(async (req, res) => {
  const { leaveType, fromDate, toDate } = req.body;
  const studentId = req.user._id;

  if (!leaveType || !fromDate || !toDate) {
    throw new AppError('Leave type, from date, and to date are required', 400);
  }

  const eligibilityResult = await checkLeaveEligibility(
    studentId,
    leaveType,
    fromDate,
    toDate
  );

  res.status(200).json({
    success: true,
    data: eligibilityResult
  });
});

// @desc    Get leave calendar
// @route   GET /api/leave/calendar
// @access  Faculty, Admin
const getCalendar = asyncHandler(async (req, res) => {
  const { 
    studentId, 
    departmentId, 
    month, 
    year,
    status 
  } = req.query;

  // Faculty can only see their department's calendar
  let calendarOptions = { month, year, status };

  if (req.user.role === 'faculty') {
    if (!departmentId) {
      const faculty = await User.findById(req.user._id);
      calendarOptions.departmentId = faculty.facultyInfo?.department;
    } else {
      // Verify faculty belongs to requested department
      const faculty = await User.findById(req.user._id);
      if (faculty.facultyInfo?.department?.toString() !== departmentId) {
        throw new AppError('You can only view calendar for your department', 403);
      }
      calendarOptions.departmentId = departmentId;
    }
  } else if (req.user.role === 'admin') {
    if (studentId) calendarOptions.studentId = studentId;
    if (departmentId) calendarOptions.departmentId = departmentId;
  }

  const calendar = await getLeaveCalendar(calendarOptions);

  res.status(200).json({
    success: true,
    data: calendar
  });
});

// @desc    Get department leave summary
// @route   GET /api/leave/department-summary/:departmentId?
// @access  Faculty, Admin
const getDepartmentLeaveSummary = asyncHandler(async (req, res) => {
  let departmentId = req.params.departmentId;
  const { academicYear, month, year } = req.query;

  // Faculty can only see their own department
  if (req.user.role === 'faculty') {
    const faculty = await User.findById(req.user._id);
    departmentId = faculty.facultyInfo?.department?.toString();
    
    if (!departmentId) {
      throw new AppError('Faculty department not found', 404);
    }
  }

  if (!departmentId) {
    throw new AppError('Department ID is required', 400);
  }

  // Get department info
  const department = await Department.findById(departmentId);
  if (!department) {
    throw new AppError('Department not found', 404);
  }

  // Get department students
  const students = await User.find({
    role: 'student',
    'studentInfo.department': departmentId,
    isActive: true
  }).select('_id firstName lastName studentInfo.rollNumber studentInfo.semester');

  // Build date filter
  let dateFilter = {};
  if (academicYear) {
    dateFilter.academicYear = academicYear;
  }
  if (month && year) {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);
    dateFilter.applicationDate = {
      $gte: startOfMonth,
      $lte: endOfMonth
    };
  }

  // Get leave statistics
  const leaveStats = await Leave.aggregate([
    {
      $match: {
        student: { $in: students.map(s => s._id) },
        ...dateFilter
      }
    },
    {
      $group: {
        _id: {
          status: '$status',
          type: '$leaveType'
        },
        count: { $sum: 1 },
        totalDays: { $sum: '$totalDays' }
      }
    }
  ]);

  // Get semester-wise breakdown
  const semesterStats = await Leave.aggregate([
    {
      $match: {
        student: { $in: students.map(s => s._id) },
        ...dateFilter,
        status: 'approved'
      }
    },
    {
      $group: {
        _id: '$semester',
        applications: { $sum: 1 },
        totalDays: { $sum: '$totalDays' },
        students: { $addToSet: '$student' }
      }
    }
  ]);

  // Get top leave applicants
  const topApplicants = await Leave.aggregate([
    {
      $match: {
        student: { $in: students.map(s => s._id) },
        ...dateFilter
      }
    },
    {
      $group: {
        _id: '$student',
        applications: { $sum: 1 },
        totalDays: { $sum: '$totalDays' },
        approved: {
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        }
      }
    },
    { $sort: { totalDays: -1 } },
    { $limit: 10 }
  ]);

  // Populate student details for top applicants
  const topApplicantsWithDetails = await Promise.all(
    topApplicants.map(async (applicant) => {
      const student = students.find(s => s._id.toString() === applicant._id.toString());
      return {
        ...applicant,
        studentName: student ? student.fullName : 'Unknown',
        rollNumber: student ? student.studentInfo.rollNumber : 'Unknown'
      };
    })
  );

  res.status(200).json({
    success: true,
    data: {
      department: {
        id: department._id,
        name: department.name,
        code: department.code
      },
      period: { academicYear, month, year },
      statistics: {
        totalStudents: students.length,
        leaveApplications: leaveStats,
        semesterWise: semesterStats,
        topApplicants: topApplicantsWithDetails
      },
      summary: {
        totalApplications: leaveStats.reduce((sum, stat) => sum + stat.count, 0),
        totalDaysRequested: leaveStats.reduce((sum, stat) => sum + stat.totalDays, 0),
        approvalRate: Math.round(
          (leaveStats
            .filter(stat => stat._id.status === 'approved')
            .reduce((sum, stat) => sum + stat.count, 0) /
          leaveStats.reduce((sum, stat) => sum + stat.count, 0)) * 100
        ) || 0
      }
    }
  });
});

// @desc    Get leave trends and analytics
// @route   GET /api/leave/analytics
// @access  Admin
const getLeaveAnalytics = asyncHandler(async (req, res) => {
  const { period = '12', academicYear } = req.query; // months
  const periodMonths = parseInt(period);
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - periodMonths);

  // Build base filter
  let baseFilter = {
    applicationDate: { $gte: startDate }
  };

  if (academicYear) {
    baseFilter.academicYear = academicYear;
  }

  // Get various analytics
  const [
    monthlyTrends,
    departmentComparison,
    leaveTypeAnalysis,
    approvalTimeAnalysis,
    studentBehaviorAnalysis
  ] = await Promise.all([
    // Monthly trends
    Leave.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: {
            year: { $year: '$applicationDate' },
            month: { $month: '$applicationDate' }
          },
          applications: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
          totalDays: { $sum: '$totalDays' },
          avgProcessingTime: {
            $avg: {
              $divide: [
                { $subtract: ['$reviewedAt', '$applicationDate'] },
                1000 * 60 * 60 * 24 // Convert to days
              ]
            }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]),

    // Department-wise comparison
    Leave.aggregate([
      { $match: baseFilter },
      {
        $lookup: {
          from: 'users',
          localField: 'student',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      { $unwind: '$studentInfo' },
      {
        $lookup: {
          from: 'departments',
          localField: 'studentInfo.studentInfo.department',
          foreignField: '_id',
          as: 'department'
        }
      },
      { $unwind: '$department' },
      {
        $group: {
          _id: '$department._id',
          departmentName: { $first: '$department.name' },
          applications: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          avgDuration: { $avg: '$totalDays' },
          totalDays: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$totalDays', 0] } }
        }
      },
      {
        $addFields: {
          approvalRate: {
            $round: [{ $multiply: [{ $divide: ['$approved', '$applications'] }, 100] }, 2]
          }
        }
      }
    ]),

    // Leave type analysis
    Leave.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: '$leaveType',
          count: { $sum: 1 },
          avgDuration: { $avg: '$totalDays' },
          approvalRate: {
            $avg: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          urgentCount: { $sum: { $cond: ['$isUrgent', 1, 0] } }
        }
      },
      {
        $addFields: {
          approvalRate: { $multiply: ['$approvalRate', 100] }
        }
      }
    ]),

    // Approval time analysis
    Leave.aggregate([
      { 
        $match: { 
          ...baseFilter, 
          reviewedAt: { $exists: true },
          status: { $in: ['approved', 'rejected'] }
        }
      },
      {
        $addFields: {
          processingDays: {
            $divide: [
              { $subtract: ['$reviewedAt', '$applicationDate'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      {
        $group: {
          _id: '$status',
          avgProcessingTime: { $avg: '$processingDays' },
          maxProcessingTime: { $max: '$processingDays' },
          minProcessingTime: { $min: '$processingDays' },
          count: { $sum: 1 }
        }
      }
    ]),

    // Student behavior analysis
    Leave.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: '$student',
          totalApplications: { $sum: 1 },
          approvedApplications: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          totalDaysRequested: { $sum: '$totalDays' },
          avgDuration: { $avg: '$totalDays' },
          urgentApplications: { $sum: { $cond: ['$isUrgent', 1, 0] } },
          leaveTypes: { $addToSet: '$leaveType' }
        }
      },
      {
        $addFields: {
          approvalRate: {
            $multiply: [
              { $divide: ['$approvedApplications', '$totalApplications'] },
              100
            ]
          }
        }
      },
      {
        $facet: {
          highFrequency: [
            { $match: { totalApplications: { $gte: 5 } } },
            { $sort: { totalApplications: -1 } },
            { $limit: 10 }
          ],
          lowApprovalRate: [
            { $match: { approvalRate: { $lt: 70 }, totalApplications: { $gte: 3 } } },
            { $sort: { approvalRate: 1 } },
            { $limit: 10 }
          ]
        }
      }
    ])
  ]);

  res.status(200).json({
    success: true,
    data: {
      period: `${periodMonths} months`,
      trends: {
        monthly: monthlyTrends,
        departments: departmentComparison,
        leaveTypes: leaveTypeAnalysis
      },
      performance: {
        approvalTimes: approvalTimeAnalysis,
        studentBehavior: studentBehaviorAnalysis[0]
      },
      insights: generateInsights(monthlyTrends, departmentComparison, leaveTypeAnalysis)
    }
  });
});

// Helper function to generate insights
function generateInsights(monthlyTrends, departmentComparison, leaveTypeAnalysis) {
  const insights = [];

  // Monthly trend insights
  if (monthlyTrends.length >= 2) {
    const recent = monthlyTrends[monthlyTrends.length - 1];
    const previous = monthlyTrends[monthlyTrends.length - 2];
    
    const changePercent = ((recent.applications - previous.applications) / previous.applications) * 100;
    
    if (Math.abs(changePercent) > 20) {
      insights.push({
        type: 'trend',
        message: `Leave applications ${changePercent > 0 ? 'increased' : 'decreased'} by ${Math.abs(changePercent).toFixed(1)}% this month`,
        severity: Math.abs(changePercent) > 50 ? 'high' : 'medium'
      });
    }
  }

  // Department insights
  if (departmentComparison.length > 0) {
    const highest = departmentComparison.reduce((max, dept) => 
      dept.applications > max.applications ? dept : max
    );
    
    const lowest = departmentComparison.reduce((min, dept) => 
      dept.approvalRate < min.approvalRate ? dept : min
    );

    if (lowest.approvalRate < 60) {
      insights.push({
        type: 'approval',
        message: `${lowest.departmentName} has low approval rate (${lowest.approvalRate}%)`,
        severity: 'high'
      });
    }
  }

  // Leave type insights
  const urgentTypes = leaveTypeAnalysis.filter(type => type.urgentCount > type.count * 0.3);
  urgentTypes.forEach(type => {
    insights.push({
      type: 'pattern',
      message: `High urgent applications for ${type._id} leave (${type.urgentCount} out of ${type.count})`,
      severity: 'medium'
    });
  });

  return insights;
}

module.exports = {
  getLeaveBalance,
  getLeaveReport,
  checkEligibility,
  getCalendar,
  getDepartmentLeaveSummary,
  getLeaveAnalytics
};