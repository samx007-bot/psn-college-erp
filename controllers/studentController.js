const { User, Attendance, Grade, Leave, Subject, Department, AcademicYear } = require('../models');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { createDefaultPassword } = require('../utils/passwordUtils');

// @desc    Get all students with filtering and pagination
// @route   GET /api/students
// @access  Faculty, Admin
const getStudents = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    department,
    semester,
    batch,
    section,
    search,
    academicYear,
    sortBy = 'firstName',
    sortOrder = 'asc'
  } = req.query;

  // Build filter object
  const filter = { role: 'student', isActive: true };

  if (department) {
    filter['studentInfo.department'] = department;
  }

  if (semester) {
    filter['studentInfo.semester'] = parseInt(semester);
  }

  if (batch) {
    filter['studentInfo.batch'] = batch;
  }

  if (section) {
    filter['studentInfo.section'] = section;
  }

  if (academicYear) {
    filter['studentInfo.academicYear'] = academicYear;
  }

  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { userId: { $regex: search, $options: 'i' } },
      { 'studentInfo.rollNumber': { $regex: search, $options: 'i' } }
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
      { path: 'createdBy', select: 'firstName lastName' }
    ]
  };

  const students = await User.paginate(filter, options);

  res.status(200).json({
    success: true,
    data: {
      students: students.docs,
      pagination: {
        currentPage: students.page,
        totalPages: students.totalPages,
        totalStudents: students.totalDocs,
        hasNext: students.hasNextPage,
        hasPrev: students.hasPrevPage
      }
    }
  });
});

// @desc    Get single student profile
// @route   GET /api/students/:id
// @access  Faculty, Admin, Own Student
const getStudent = asyncHandler(async (req, res) => {
  const student = await User.findOne({
    _id: req.params.id,
    role: 'student'
  })
  .populate('studentInfo.department', 'name code hod')
  .populate('createdBy', 'firstName lastName')
  .populate('updatedBy', 'firstName lastName');

  if (!student) {
    throw new AppError('Student not found', 404);
  }

  // Students can only view their own profile (unless admin/faculty)
  if (req.user.role === 'student' && student._id.toString() !== req.user._id.toString()) {
    throw new AppError('Access denied', 403);
  }

  res.status(200).json({
    success: true,
    data: {
      student
    }
  });
});

// @desc    Create new student
// @route   POST /api/students
// @access  Admin
const createStudent = asyncHandler(async (req, res) => {
  const {
    email,
    firstName,
    lastName,
    phone,
    dateOfBirth,
    gender,
    address,
    studentInfo
  } = req.body;

  // Check if student already exists
  const existingStudent = await User.findOne({
    $or: [
      { email },
      { 'studentInfo.rollNumber': studentInfo?.rollNumber }
    ]
  });

  if (existingStudent) {
    throw new AppError('Student already exists with this email or roll number', 400);
  }

  // Generate student ID
  const userId = await User.generateUserId('student', studentInfo?.department);

  // Get current academic year
  const currentAcademicYear = await AcademicYear.getCurrentAcademicYear();

  // Create default password
  const defaultPassword = createDefaultPassword(firstName, lastName, userId);

  // Prepare student data
  const studentData = {
    userId,
    email,
    password: defaultPassword,
    firstName,
    lastName,
    role: 'student',
    phone,
    dateOfBirth,
    gender,
    address,
    studentInfo: {
      ...studentInfo,
      academicYear: currentAcademicYear?.year || new Date().getFullYear().toString()
    },
    createdBy: req.user._id,
    isActive: true
  };

  const student = await User.create(studentData);
  
  // Populate department information
  await student.populate('studentInfo.department', 'name code');

  res.status(201).json({
    success: true,
    message: 'Student created successfully',
    data: {
      student,
      defaultPassword // Send back for admin to communicate to student
    }
  });
});

// @desc    Update student profile
// @route   PUT /api/students/:id
// @access  Admin, Own Student (limited fields)
const updateStudent = asyncHandler(async (req, res) => {
  const student = await User.findOne({
    _id: req.params.id,
    role: 'student'
  });

  if (!student) {
    throw new AppError('Student not found', 404);
  }

  // Define allowed fields based on role
  let allowedFields = [];

  if (req.user.role === 'admin') {
    allowedFields = [
      'firstName', 'lastName', 'phone', 'email', 'dateOfBirth', 'gender',
      'address', 'studentInfo', 'isActive'
    ];
  } else if (req.user.role === 'student' && student._id.toString() === req.user._id.toString()) {
    allowedFields = [
      'phone', 'address', 'studentInfo.parentContact'
    ];
  } else {
    throw new AppError('Access denied', 403);
  }

  // Build update object
  const updates = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  updates.updatedBy = req.user._id;

  const updatedStudent = await User.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  )
  .populate('studentInfo.department', 'name code')
  .populate('updatedBy', 'firstName lastName');

  res.status(200).json({
    success: true,
    message: 'Student updated successfully',
    data: {
      student: updatedStudent
    }
  });
});

// @desc    Delete/Deactivate student
// @route   DELETE /api/students/:id
// @access  Admin
const deleteStudent = asyncHandler(async (req, res) => {
  const student = await User.findOne({
    _id: req.params.id,
    role: 'student'
  });

  if (!student) {
    throw new AppError('Student not found', 404);
  }

  // Soft delete - deactivate instead of removing
  student.isActive = false;
  student.updatedBy = req.user._id;
  await student.save();

  res.status(200).json({
    success: true,
    message: 'Student deactivated successfully'
  });
});

// @desc    Get student's attendance summary
// @route   GET /api/students/:id/attendance
// @access  Faculty, Admin, Own Student
const getStudentAttendance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { academicYear, semester, subject, fromDate, toDate } = req.query;

  // Verify student exists and access permission
  const student = await User.findOne({ _id: id, role: 'student' });
  if (!student) {
    throw new AppError('Student not found', 404);
  }

  if (req.user.role === 'student' && student._id.toString() !== req.user._id.toString()) {
    throw new AppError('Access denied', 403);
  }

  // Get current academic year if not provided
  const currentAcademicYear = academicYear || (await AcademicYear.getCurrentAcademicYear())?.year;

  // Get attendance summary
  const attendanceSummary = await Attendance.getStudentAttendanceSummary(
    id,
    currentAcademicYear,
    semester ? parseInt(semester) : undefined
  );

  // Get detailed attendance if specific filters are provided
  let detailedAttendance = [];
  if (subject || fromDate || toDate) {
    const filter = { student: id };
    if (subject) filter.subject = subject;
    if (fromDate && toDate) {
      filter.date = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate)
      };
    }

    detailedAttendance = await Attendance.find(filter)
      .populate('subject', 'name code')
      .populate('faculty', 'firstName lastName')
      .sort({ date: -1 });
  }

  res.status(200).json({
    success: true,
    data: {
      studentId: id,
      academicYear: currentAcademicYear,
      summary: attendanceSummary,
      detailed: detailedAttendance
    }
  });
});

// @desc    Get student's grades
// @route   GET /api/students/:id/grades
// @access  Faculty, Admin, Own Student
const getStudentGrades = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { academicYear, semester, subject } = req.query;

  // Verify student exists and access permission
  const student = await User.findOne({ _id: id, role: 'student' });
  if (!student) {
    throw new AppError('Student not found', 404);
  }

  if (req.user.role === 'student' && student._id.toString() !== req.user._id.toString()) {
    throw new AppError('Access denied', 403);
  }

  // Build filter
  const filter = { 
    student: id, 
    status: 'published' 
  };

  if (academicYear) filter.academicYear = academicYear;
  if (semester) filter.semester = parseInt(semester);
  if (subject) filter.subject = subject;

  // Get grades
  const grades = await Grade.find(filter)
    .populate('subject', 'name code credits')
    .populate('faculty', 'firstName lastName')
    .sort({ assessmentDate: -1 });

  // Calculate CGPA
  const cgpa = await Grade.calculateCGPA(
    id, 
    academicYear || student.studentInfo.academicYear,
    semester ? parseInt(semester) : undefined
  );

  // Get subject-wise performance if specific subject
  let subjectPerformance = null;
  if (subject) {
    subjectPerformance = await Grade.getSubjectPerformance(
      id,
      subject,
      academicYear || student.studentInfo.academicYear
    );
  }

  res.status(200).json({
    success: true,
    data: {
      studentId: id,
      grades,
      cgpa,
      subjectPerformance
    }
  });
});

// @desc    Get student's leave applications
// @route   GET /api/students/:id/leaves
// @access  Faculty, Admin, Own Student
const getStudentLeaves = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, academicYear, page = 1, limit = 20 } = req.query;

  // Verify student exists and access permission
  const student = await User.findOne({ _id: id, role: 'student' });
  if (!student) {
    throw new AppError('Student not found', 404);
  }

  if (req.user.role === 'student' && student._id.toString() !== req.user._id.toString()) {
    throw new AppError('Access denied', 403);
  }

  // Build filter
  const filter = { student: id };
  if (status) filter.status = status;
  if (academicYear) filter.academicYear = academicYear;

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { applicationDate: -1 },
    populate: [
      { path: 'reviewedBy', select: 'firstName lastName' },
      { path: 'approvalWorkflow.approver', select: 'firstName lastName role' }
    ]
  };

  const leaves = await Leave.paginate(filter, options);

  // Get leave statistics
  const leaveStats = await Leave.getLeaveStatistics(
    id,
    academicYear || student.studentInfo.academicYear
  );

  res.status(200).json({
    success: true,
    data: {
      studentId: id,
      leaves: leaves.docs,
      pagination: {
        currentPage: leaves.page,
        totalPages: leaves.totalPages,
        totalLeaves: leaves.totalDocs
      },
      statistics: leaveStats
    }
  });
});

// @desc    Get student dashboard data
// @route   GET /api/students/:id/dashboard
// @access  Faculty, Admin, Own Student
const getStudentDashboard = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verify student exists and access permission
  const student = await User.findOne({ _id: id, role: 'student' })
    .populate('studentInfo.department', 'name code');
  
  if (!student) {
    throw new AppError('Student not found', 404);
  }

  if (req.user.role === 'student' && student._id.toString() !== req.user._id.toString()) {
    throw new AppError('Access denied', 403);
  }

  const currentAcademicYear = await AcademicYear.getCurrentAcademicYear();
  const currentSemester = await AcademicYear.getCurrentSemester();

  // Get attendance summary
  const attendanceSummary = await Attendance.getStudentAttendanceSummary(
    id,
    currentAcademicYear?.year,
    currentSemester?.semesterNumber
  );

  // Get recent grades
  const recentGrades = await Grade.find({
    student: id,
    status: 'published'
  })
  .populate('subject', 'name code')
  .sort({ createdAt: -1 })
  .limit(5);

  // Get pending/recent leaves
  const recentLeaves = await Leave.find({
    student: id,
    status: { $in: ['pending', 'approved'] }
  })
  .sort({ applicationDate: -1 })
  .limit(3);

  // Calculate CGPA
  const cgpa = await Grade.calculateCGPA(
    id,
    currentAcademicYear?.year,
    currentSemester?.semesterNumber
  );

  res.status(200).json({
    success: true,
    data: {
      student: {
        id: student._id,
        name: student.fullName,
        rollNumber: student.studentInfo.rollNumber,
        department: student.studentInfo.department,
        semester: student.studentInfo.semester,
        batch: student.studentInfo.batch
      },
      academicInfo: {
        currentAcademicYear: currentAcademicYear?.year,
        currentSemester: currentSemester?.semesterNumber,
        cgpa
      },
      attendanceSummary,
      recentGrades,
      recentLeaves
    }
  });
});

module.exports = {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentAttendance,
  getStudentGrades,
  getStudentLeaves,
  getStudentDashboard
};