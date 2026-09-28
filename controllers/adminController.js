const { User, Department, Subject, AcademicYear, Attendance, Grade, Leave } = require('../models');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { createDefaultPassword } = require('../utils/passwordUtils');

// @desc    Get admin dashboard data
// @route   GET /api/admin/dashboard
// @access  Admin
const getAdminDashboard = asyncHandler(async (req, res) => {
  // Get current academic year
  const currentAcademicYear = await AcademicYear.getCurrentAcademicYear();
  const currentSemester = await AcademicYear.getCurrentSemester();

  // Get counts
  const totalStudents = await User.countDocuments({ role: 'student', isActive: true });
  const totalFaculty = await User.countDocuments({ role: 'faculty', isActive: true });
  const totalDepartments = await Department.countDocuments({ isActive: true });
  const totalSubjects = await Subject.countDocuments({ 
    academicYear: currentAcademicYear?.year,
    isActive: true 
  });

  // Get recent registrations (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentStudents = await User.countDocuments({
    role: 'student',
    createdAt: { $gte: thirtyDaysAgo }
  });
  const recentFaculty = await User.countDocuments({
    role: 'faculty',
    createdAt: { $gte: thirtyDaysAgo }
  });

  // Get pending leave approvals
  const pendingLeaves = await Leave.countDocuments({ status: 'pending' });

  // Get attendance statistics for today
  const today = new Date();
  const todayAttendance = await Attendance.aggregate([
    {
      $match: {
        date: {
          $gte: new Date(today.setHours(0, 0, 0, 0)),
          $lte: new Date(today.setHours(23, 59, 59, 999))
        }
      }
    },
    {
      $group: {
        _id: null,
        totalRecords: { $sum: 1 },
        presentCount: {
          $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] }
        }
      }
    }
  ]);

  const todayAttendancePercentage = todayAttendance.length > 0 
    ? Math.round((todayAttendance[0].presentCount / todayAttendance[0].totalRecords) * 100)
    : 0;

  // Get department-wise student distribution
  const departmentDistribution = await User.aggregate([
    {
      $match: { role: 'student', isActive: true }
    },
    {
      $lookup: {
        from: 'departments',
        localField: 'studentInfo.department',
        foreignField: '_id',
        as: 'department'
      }
    },
    {
      $unwind: '$department'
    },
    {
      $group: {
        _id: '$department._id',
        departmentName: { $first: '$department.name' },
        departmentCode: { $first: '$department.code' },
        studentCount: { $sum: 1 }
      }
    },
    {
      $sort: { studentCount: -1 }
    }
  ]);

  // Get recent activities
  const recentActivities = await Promise.all([
    // Recent user registrations
    User.find({ 
      createdAt: { $gte: thirtyDaysAgo },
      role: { $in: ['student', 'faculty'] }
    })
    .select('firstName lastName role createdAt')
    .sort({ createdAt: -1 })
    .limit(5),
    
    // Recent leave applications
    Leave.find({ 
      applicationDate: { $gte: thirtyDaysAgo }
    })
    .populate('student', 'firstName lastName')
    .select('student leaveType fromDate toDate status applicationDate')
    .sort({ applicationDate: -1 })
    .limit(5)
  ]);

  res.status(200).json({
    success: true,
    data: {
      academicInfo: {
        currentAcademicYear: currentAcademicYear?.year,
        currentSemester: currentSemester?.semesterNumber,
        academicYearStatus: currentAcademicYear?.status
      },
      counts: {
        totalStudents,
        totalFaculty,
        totalDepartments,
        totalSubjects,
        recentStudents,
        recentFaculty,
        pendingLeaves
      },
      todayStats: {
        attendancePercentage: todayAttendancePercentage,
        totalAttendanceRecords: todayAttendance[0]?.totalRecords || 0
      },
      departmentDistribution,
      recentActivities: {
        userRegistrations: recentActivities[0],
        leaveApplications: recentActivities[1]
      }
    }
  });
});

// @desc    Get all users with advanced filtering
// @route   GET /api/admin/users
// @access  Admin
const getAllUsers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    role,
    department,
    status,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build filter object
  const filter = {};

  if (role && role !== 'all') {
    filter.role = role;
  }

  if (department) {
    filter.$or = [
      { 'studentInfo.department': department },
      { 'facultyInfo.department': department }
    ];
  }

  if (status) {
    filter.isActive = status === 'active';
  }

  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { userId: { $regex: search, $options: 'i' } },
      { 'studentInfo.rollNumber': { $regex: search, $options: 'i' } },
      { 'facultyInfo.employeeId': { $regex: search, $options: 'i' } }
    ];
  }

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort,
    populate: [
      { path: 'studentInfo.department', select: 'name code' },
      { path: 'facultyInfo.department', select: 'name code' },
      { path: 'createdBy', select: 'firstName lastName' }
    ]
  };

  const users = await User.paginate(filter, options);

  res.status(200).json({
    success: true,
    data: {
      users: users.docs,
      pagination: {
        currentPage: users.page,
        totalPages: users.totalPages,
        totalUsers: users.totalDocs,
        hasNext: users.hasNextPage,
        hasPrev: users.hasPrevPage
      }
    }
  });
});

// @desc    Create bulk users from CSV data
// @route   POST /api/admin/users/bulk
// @access  Admin
const createBulkUsers = asyncHandler(async (req, res) => {
  const { users } = req.body; // Array of user objects

  if (!users || !Array.isArray(users) || users.length === 0) {
    throw new AppError('Users data is required and must be a non-empty array', 400);
  }

  const results = {
    success: [],
    errors: [],
    summary: {
      total: users.length,
      created: 0,
      failed: 0
    }
  };

  // Process each user
  for (let i = 0; i < users.length; i++) {
    try {
      const userData = users[i];
      
      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { email: userData.email },
          { 'studentInfo.rollNumber': userData.studentInfo?.rollNumber },
          { 'facultyInfo.employeeId': userData.facultyInfo?.employeeId }
        ]
      });

      if (existingUser) {
        results.errors.push({
          row: i + 1,
          email: userData.email,
          error: 'User already exists'
        });
        results.summary.failed++;
        continue;
      }

      // Generate user ID
      const userId = await User.generateUserId(userData.role, userData.studentInfo?.department || userData.facultyInfo?.department);

      // Create default password
      const defaultPassword = createDefaultPassword(userData.firstName, userData.lastName, userId);

      // Prepare user data
      const newUserData = {
        ...userData,
        userId,
        password: defaultPassword,
        createdBy: req.user._id,
        isActive: true
      };

      const user = await User.create(newUserData);
      
      results.success.push({
        row: i + 1,
        userId: user.userId,
        email: user.email,
        name: user.fullName,
        defaultPassword
      });
      results.summary.created++;

    } catch (error) {
      results.errors.push({
        row: i + 1,
        email: users[i]?.email || 'unknown',
        error: error.message
      });
      results.summary.failed++;
    }
  }

  res.status(200).json({
    success: true,
    message: `Bulk user creation completed. ${results.summary.created} users created, ${results.summary.failed} failed.`,
    data: results
  });
});

// @desc    Update user status (activate/deactivate)
// @route   PUT /api/admin/users/:id/status
// @access  Admin
const updateUserStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  
  if (typeof isActive !== 'boolean') {
    throw new AppError('isActive must be a boolean value', 400);
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Prevent admin from deactivating themselves
  if (user._id.toString() === req.user._id.toString() && !isActive) {
    throw new AppError('You cannot deactivate your own account', 400);
  }

  user.isActive = isActive;
  user.updatedBy = req.user._id;
  await user.save();

  res.status(200).json({
    success: true,
    message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
    data: {
      userId: user.userId,
      email: user.email,
      isActive: user.isActive
    }
  });
});

// @desc    Delete user permanently
// @route   DELETE /api/admin/users/:id
// @access  Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Prevent admin from deleting themselves
  if (user._id.toString() === req.user._id.toString()) {
    throw new AppError('You cannot delete your own account', 400);
  }

  // Check if user has associated records
  const hasAttendance = await Attendance.exists({ 
    $or: [{ student: user._id }, { faculty: user._id }] 
  });
  
  const hasGrades = await Grade.exists({ 
    $or: [{ student: user._id }, { faculty: user._id }] 
  });
  
  const hasLeaves = await Leave.exists({ student: user._id });

  if (hasAttendance || hasGrades || hasLeaves) {
    throw new AppError(
      'Cannot delete user with existing attendance, grades, or leave records. Please deactivate instead.',
      400
    );
  }

  await User.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'User deleted successfully'
  });
});

// @desc    Reset user password
// @route   PUT /api/admin/users/:id/reset-password
// @access  Admin
const resetUserPassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Generate new password
  const newPassword = createDefaultPassword(user.firstName, user.lastName, user.userId);
  
  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password reset successfully',
    data: {
      userId: user.userId,
      email: user.email,
      newPassword // In production, this should be sent via secure channel
    }
  });
});

// @desc    Get system statistics
// @route   GET /api/admin/statistics
// @access  Admin
const getSystemStatistics = asyncHandler(async (req, res) => {
  const { period = '30' } = req.query; // days
  const periodDays = parseInt(period);
  const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  // User statistics
  const userStats = await Promise.all([
    User.countDocuments({ role: 'student', isActive: true }),
    User.countDocuments({ role: 'faculty', isActive: true }),
    User.countDocuments({ role: 'admin', isActive: true }),
    User.countDocuments({ createdAt: { $gte: startDate } }),
    User.countDocuments({ isActive: false })
  ]);

  // Attendance statistics
  const attendanceStats = await Attendance.aggregate([
    {
      $match: { date: { $gte: startDate } }
    },
    {
      $group: {
        _id: null,
        totalRecords: { $sum: 1 },
        presentCount: {
          $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] }
        },
        absentCount: {
          $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
        }
      }
    }
  ]);

  // Leave statistics
  const leaveStats = await Leave.aggregate([
    {
      $match: { applicationDate: { $gte: startDate } }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Grade statistics
  const gradeStats = await Grade.aggregate([
    {
      $match: { 
        createdAt: { $gte: startDate },
        status: 'published'
      }
    },
    {
      $group: {
        _id: '$grade',
        count: { $sum: 1 }
      }
    }
  ]);

  // Department-wise statistics
  const departmentStats = await User.aggregate([
    {
      $match: { role: 'student', isActive: true }
    },
    {
      $lookup: {
        from: 'departments',
        localField: 'studentInfo.department',
        foreignField: '_id',
        as: 'department'
      }
    },
    {
      $unwind: '$department'
    },
    {
      $group: {
        _id: {
          departmentId: '$department._id',
          semester: '$studentInfo.semester'
        },
        departmentName: { $first: '$department.name' },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.departmentId',
        departmentName: { $first: '$departmentName' },
        totalStudents: { $sum: '$count' },
        semesterWise: {
          $push: {
            semester: '$_id.semester',
            count: '$count'
          }
        }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      period: `${periodDays} days`,
      users: {
        students: userStats[0],
        faculty: userStats[1],
        admins: userStats[2],
        newRegistrations: userStats[3],
        inactiveUsers: userStats[4]
      },
      attendance: attendanceStats[0] || { totalRecords: 0, presentCount: 0, absentCount: 0 },
      leaves: leaveStats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, { pending: 0, approved: 0, rejected: 0 }),
      grades: gradeStats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      departments: departmentStats
    }
  });
});

// @desc    Export system data
// @route   GET /api/admin/export
// @access  Admin
const exportSystemData = asyncHandler(async (req, res) => {
  const { type, format = 'json', filters = {} } = req.query;

  let data;
  const exportTimestamp = new Date().toISOString();

  switch (type) {
    case 'users':
      data = await User.find(filters)
        .populate('studentInfo.department', 'name code')
        .populate('facultyInfo.department', 'name code')
        .select('-password');
      break;

    case 'attendance':
      data = await Attendance.find(filters)
        .populate('student', 'firstName lastName studentInfo.rollNumber')
        .populate('subject', 'name code')
        .populate('faculty', 'firstName lastName');
      break;

    case 'grades':
      data = await Grade.find({ ...filters, status: 'published' })
        .populate('student', 'firstName lastName studentInfo.rollNumber')
        .populate('subject', 'name code')
        .populate('faculty', 'firstName lastName');
      break;

    case 'leaves':
      data = await Leave.find(filters)
        .populate('student', 'firstName lastName studentInfo.rollNumber')
        .populate('reviewedBy', 'firstName lastName');
      break;

    default:
      throw new AppError('Invalid export type', 400);
  }

  res.status(200).json({
    success: true,
    data: {
      exportType: type,
      format,
      timestamp: exportTimestamp,
      recordCount: data.length,
      records: data
    }
  });
});

module.exports = {
  getAdminDashboard,
  getAllUsers,
  createBulkUsers,
  updateUserStatus,
  deleteUser,
  resetUserPassword,
  getSystemStatistics,
  exportSystemData
};