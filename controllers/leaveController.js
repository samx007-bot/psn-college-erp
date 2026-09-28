const { Leave, User, AcademicYear, Subject } = require('../models');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// @desc    Apply for leave
// @route   POST /api/leave/apply
// @access  Student
const applyLeave = asyncHandler(async (req, res) => {
  const {
    leaveType,
    fromDate,
    toDate,
    reason,
    description,
    contactDuringLeave,
    affectedSubjects,
    isUrgent = false
  } = req.body;

  // Get current academic year and semester
  const currentAcademicYear = await AcademicYear.getCurrentAcademicYear();
  const student = await User.findById(req.user._id).populate('studentInfo.department');

  // Validate dates
  const startDate = new Date(fromDate);
  const endDate = new Date(toDate);
  const today = new Date();

  if (startDate < today && !isUrgent) {
    throw new AppError('Cannot apply for past dates unless it is an urgent leave', 400);
  }

  if (startDate >= endDate) {
    throw new AppError('End date must be after start date', 400);
  }

  // Calculate total days
  const timeDiff = endDate - startDate;
  const totalDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;

  // Check for overlapping leave applications
  const overlappingLeave = await Leave.findOne({
    student: req.user._id,
    status: { $in: ['pending', 'approved'] },
    $or: [
      {
        fromDate: { $lte: endDate },
        toDate: { $gte: startDate }
      }
    ]
  });

  if (overlappingLeave) {
    throw new AppError('You have an overlapping leave application for these dates', 400);
  }

  // Get leave balance for the academic year
  const existingLeaves = await Leave.find({
    student: req.user._id,
    academicYear: currentAcademicYear?.year,
    status: 'approved'
  });

  const totalLeaveTaken = existingLeaves.reduce((sum, leave) => sum + leave.totalDays, 0);
  const leaveBalance = {
    totalAllowed: 30, // Default annual leave allowance
    usedThisYear: totalLeaveTaken,
    remaining: 30 - totalLeaveTaken
  };

  if (totalDays > leaveBalance.remaining && leaveType !== 'medical') {
    throw new AppError(`Insufficient leave balance. Available: ${leaveBalance.remaining} days`, 400);
  }

  // Setup approval workflow based on leave duration and type
  const approvalWorkflow = await setupApprovalWorkflow(
    student,
    totalDays,
    leaveType,
    isUrgent
  );

  // Create leave application
  const leave = await Leave.create({
    student: req.user._id,
    leaveType,
    fromDate: startDate,
    toDate: endDate,
    totalDays,
    reason,
    description,
    contactDuringLeave,
    affectedSubjects: affectedSubjects || [],
    isUrgent,
    approvalWorkflow,
    leaveBalance,
    academicYear: currentAcademicYear?.year || new Date().getFullYear().toString(),
    semester: student.studentInfo?.semester || 1,
    applicationDate: new Date()
  });

  // Populate the created leave
  await leave.populate([
    { path: 'student', select: 'firstName lastName studentInfo.rollNumber' },
    { path: 'approvalWorkflow.approver', select: 'firstName lastName role' },
    { path: 'affectedSubjects.subject', select: 'name code' }
  ]);

  res.status(201).json({
    success: true,
    message: 'Leave application submitted successfully',
    data: {
      leave,
      nextApprover: approvalWorkflow[0]?.approver ? 
        `${approvalWorkflow[0].approverRole} approval required` : 
        'No approval required'
    }
  });
});

// @desc    Get all leave applications (with filtering)
// @route   GET /api/leave
// @access  Student (own), Faculty (for approval), Admin (all)
const getLeaveApplications = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    leaveType,
    student: studentId,
    fromDate,
    toDate,
    approver,
    sortBy = 'applicationDate',
    sortOrder = 'desc'
  } = req.query;

  // Build filter based on user role
  let filter = {};

  if (req.user.role === 'student') {
    // Students can only see their own applications
    filter.student = req.user._id;
  } else if (req.user.role === 'faculty') {
    // Faculty can see applications they need to approve
    if (approver === 'me') {
      filter['approvalWorkflow.approver'] = req.user._id;
    } else {
      // Or all applications in their department
      const faculty = await User.findById(req.user._id);
      if (faculty.facultyInfo?.department) {
        const departmentStudents = await User.find({
          role: 'student',
          'studentInfo.department': faculty.facultyInfo.department
        }).select('_id');
        
        filter.student = { $in: departmentStudents.map(s => s._id) };
      }
    }
  }
  // Admins can see all (no additional filter)

  // Apply other filters
  if (status) filter.status = status;
  if (leaveType) filter.leaveType = leaveType;
  if (studentId && req.user.role !== 'student') filter.student = studentId;
  
  if (fromDate || toDate) {
    filter.applicationDate = {};
    if (fromDate) filter.applicationDate.$gte = new Date(fromDate);
    if (toDate) filter.applicationDate.$lte = new Date(toDate);
  }

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort,
    populate: [
      { path: 'student', select: 'firstName lastName studentInfo.rollNumber studentInfo.department' },
      { path: 'reviewedBy', select: 'firstName lastName role' },
      { path: 'approvalWorkflow.approver', select: 'firstName lastName role' },
      { path: 'affectedSubjects.subject', select: 'name code' }
    ]
  };

  const leaves = await Leave.paginate(filter, options);

  res.status(200).json({
    success: true,
    data: {
      leaves: leaves.docs,
      pagination: {
        currentPage: leaves.page,
        totalPages: leaves.totalPages,
        totalLeaves: leaves.totalDocs,
        hasNext: leaves.hasNextPage,
        hasPrev: leaves.hasPrevPage
      }
    }
  });
});

// @desc    Get single leave application
// @route   GET /api/leave/:id
// @access  Student (own), Faculty, Admin
const getLeaveApplication = asyncHandler(async (req, res) => {
  const leave = await Leave.findById(req.params.id)
    .populate('student', 'firstName lastName studentInfo')
    .populate('reviewedBy', 'firstName lastName role')
    .populate('approvalWorkflow.approver', 'firstName lastName role facultyInfo.designation')
    .populate('affectedSubjects.subject', 'name code faculty');

  if (!leave) {
    throw new AppError('Leave application not found', 404);
  }

  // Check access permissions
  if (req.user.role === 'student' && leave.student._id.toString() !== req.user._id.toString()) {
    throw new AppError('Access denied', 403);
  }

  res.status(200).json({
    success: true,
    data: {
      leave
    }
  });
});

// @desc    Update leave application (student can edit pending applications)
// @route   PUT /api/leave/:id
// @access  Student (own pending applications)
const updateLeaveApplication = asyncHandler(async (req, res) => {
  const leave = await Leave.findById(req.params.id);

  if (!leave) {
    throw new AppError('Leave application not found', 404);
  }

  // Only student can update their own pending applications
  if (leave.student.toString() !== req.user._id.toString()) {
    throw new AppError('You can only update your own applications', 403);
  }

  if (leave.status !== 'pending') {
    throw new AppError('Cannot update leave application that has been processed', 400);
  }

  const {
    leaveType,
    fromDate,
    toDate,
    reason,
    description,
    contactDuringLeave,
    affectedSubjects
  } = req.body;

  // Validate dates if provided
  if (fromDate || toDate) {
    const startDate = new Date(fromDate || leave.fromDate);
    const endDate = new Date(toDate || leave.toDate);

    if (startDate >= endDate) {
      throw new AppError('End date must be after start date', 400);
    }

    // Recalculate total days
    const timeDiff = endDate - startDate;
    leave.totalDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;
    leave.fromDate = startDate;
    leave.toDate = endDate;
  }

  // Update other fields
  if (leaveType) leave.leaveType = leaveType;
  if (reason) leave.reason = reason;
  if (description !== undefined) leave.description = description;
  if (contactDuringLeave) leave.contactDuringLeave = contactDuringLeave;
  if (affectedSubjects) leave.affectedSubjects = affectedSubjects;

  await leave.save();

  // Populate updated leave
  await leave.populate([
    { path: 'student', select: 'firstName lastName studentInfo.rollNumber' },
    { path: 'approvalWorkflow.approver', select: 'firstName lastName role' }
  ]);

  res.status(200).json({
    success: true,
    message: 'Leave application updated successfully',
    data: {
      leave
    }
  });
});

// @desc    Cancel leave application
// @route   DELETE /api/leave/:id
// @access  Student (own applications)
const cancelLeaveApplication = asyncHandler(async (req, res) => {
  const leave = await Leave.findById(req.params.id);

  if (!leave) {
    throw new AppError('Leave application not found', 404);
  }

  // Only student can cancel their own applications
  if (leave.student.toString() !== req.user._id.toString()) {
    throw new AppError('You can only cancel your own applications', 403);
  }

  if (leave.status === 'cancelled') {
    throw new AppError('Leave application is already cancelled', 400);
  }

  leave.status = 'cancelled';
  await leave.save();

  res.status(200).json({
    success: true,
    message: 'Leave application cancelled successfully'
  });
});

// @desc    Approve/Reject leave application
// @route   PUT /api/leave/:id/review
// @access  Faculty, Admin
const reviewLeaveApplication = asyncHandler(async (req, res) => {
  const { action, comments } = req.body; // action: 'approve' or 'reject'
  
  if (!['approve', 'reject'].includes(action)) {
    throw new AppError('Action must be either approve or reject', 400);
  }

  const leave = await Leave.findById(req.params.id)
    .populate('student', 'firstName lastName studentInfo')
    .populate('approvalWorkflow.approver', 'firstName lastName role');

  if (!leave) {
    throw new AppError('Leave application not found', 404);
  }

  if (leave.status !== 'pending') {
    throw new AppError('Leave application has already been processed', 400);
  }

  // Check if user is authorized to review this application
  const currentApprovalStep = leave.approvalWorkflow.find(
    step => step.approver.toString() === req.user._id.toString() && step.status === 'pending'
  );

  if (!currentApprovalStep) {
    throw new AppError('You are not authorized to review this application at this stage', 403);
  }

  // Update the current approval step
  currentApprovalStep.status = action === 'approve' ? 'approved' : 'rejected';
  currentApprovalStep.comments = comments || '';
  currentApprovalStep.actionDate = new Date();

  if (action === 'reject') {
    // If rejected, mark entire application as rejected
    leave.status = 'rejected';
    leave.reviewedBy = req.user._id;
    leave.reviewedAt = new Date();
    leave.reviewComments = comments || '';
  } else {
    // Check if there are more approval steps
    const nextPendingStep = leave.approvalWorkflow.find(step => step.status === 'pending');
    
    if (!nextPendingStep) {
      // All approvals completed, mark as approved
      leave.status = 'approved';
      leave.reviewedBy = req.user._id;
      leave.reviewedAt = new Date();
      leave.reviewComments = comments || '';
    }
  }

  await leave.save();

  // Get next approver info if exists
  let nextApprover = null;
  if (action === 'approve' && leave.status === 'pending') {
    const nextStep = leave.approvalWorkflow.find(step => step.status === 'pending');
    if (nextStep) {
      nextApprover = await User.findById(nextStep.approver).select('firstName lastName role');
    }
  }

  res.status(200).json({
    success: true,
    message: `Leave application ${action}d successfully`,
    data: {
      leave,
      nextApprover,
      finalStatus: leave.status
    }
  });
});

// @desc    Get pending approvals for faculty
// @route   GET /api/leave/pending-approvals
// @access  Faculty
const getPendingApprovals = asyncHandler(async (req, res) => {
  const pendingLeaves = await Leave.find({
    'approvalWorkflow.approver': req.user._id,
    'approvalWorkflow.status': 'pending',
    status: 'pending'
  })
  .populate('student', 'firstName lastName studentInfo.rollNumber studentInfo.department')
  .populate('approvalWorkflow.approver', 'firstName lastName role')
  .sort({ applicationDate: 1 });

  // Get current approval step for each leave
  const leavesWithSteps = pendingLeaves.map(leave => {
    const currentStep = leave.approvalWorkflow.find(
      step => step.approver.toString() === req.user._id.toString() && step.status === 'pending'
    );
    
    return {
      ...leave.toObject(),
      currentApprovalStep: currentStep
    };
  });

  res.status(200).json({
    success: true,
    data: {
      pendingApprovals: leavesWithSteps,
      totalPending: leavesWithSteps.length
    }
  });
});

// @desc    Get leave statistics
// @route   GET /api/leave/statistics
// @access  Faculty, Admin
const getLeaveStatistics = asyncHandler(async (req, res) => {
  const { 
    period = '30',
    department,
    academicYear,
    semester 
  } = req.query;

  const periodDays = parseInt(period);
  const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  // Build base filter
  let baseFilter = {
    applicationDate: { $gte: startDate }
  };

  if (academicYear) baseFilter.academicYear = academicYear;
  if (semester) baseFilter.semester = parseInt(semester);

  // Department filter for faculty
  if (req.user.role === 'faculty' || department) {
    const deptId = department || req.user.facultyInfo?.department;
    if (deptId) {
      const deptStudents = await User.find({
        role: 'student',
        'studentInfo.department': deptId
      }).select('_id');
      
      baseFilter.student = { $in: deptStudents.map(s => s._id) };
    }
  }

  // Get various statistics
  const [
    statusStats,
    typeStats,
    monthlyStats,
    departmentStats
  ] = await Promise.all([
    // Status-wise statistics
    Leave.aggregate([
      { $match: baseFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),

    // Type-wise statistics
    Leave.aggregate([
      { $match: baseFilter },
      { $group: { _id: '$leaveType', count: { $sum: 1 } } }
    ]),

    // Monthly statistics
    Leave.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: {
            year: { $year: '$applicationDate' },
            month: { $month: '$applicationDate' }
          },
          count: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]),

    // Department-wise statistics (admin only)
    req.user.role === 'admin' ? Leave.aggregate([
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
          count: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } }
        }
      }
    ]) : []
  ]);

  res.status(200).json({
    success: true,
    data: {
      period: `${periodDays} days`,
      statusDistribution: statusStats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      typeDistribution: typeStats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      monthlyTrends: monthlyStats,
      departmentWise: departmentStats,
      totalApplications: statusStats.reduce((sum, stat) => sum + stat.count, 0)
    }
  });
});

// Helper function to setup approval workflow
async function setupApprovalWorkflow(student, totalDays, leaveType, isUrgent) {
  const workflow = [];
  let order = 1;

  // Get department HOD
  const department = await Department.findById(student.studentInfo.department)
    .populate('hod', 'firstName lastName');

  // For leaves > 3 days or urgent leaves, require HOD approval
  if (totalDays > 3 || isUrgent || leaveType === 'medical') {
    if (department.hod) {
      workflow.push({
        approver: department.hod._id,
        approverRole: 'hod',
        status: 'pending',
        order: order++
      });
    }
  }

  // For leaves > 7 days, require additional approval
  if (totalDays > 7) {
    // Find a dean or principal (admin role users)
    const dean = await User.findOne({ 
      role: 'admin', 
      isActive: true 
    });

    if (dean) {
      workflow.push({
        approver: dean._id,
        approverRole: 'dean',
        status: 'pending',
        order: order++
      });
    }
  }

  return workflow;
}

module.exports = {
  applyLeave,
  getLeaveApplications,
  getLeaveApplication,
  updateLeaveApplication,
  cancelLeaveApplication,
  reviewLeaveApplication,
  getPendingApprovals,
  getLeaveStatistics
};