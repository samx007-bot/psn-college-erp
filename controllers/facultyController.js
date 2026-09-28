const { User, Attendance, Grade, Leave, Subject, Department, AcademicYear } = require('../models');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { createDefaultPassword } = require('../utils/passwordUtils');

// @desc    Get all faculty members with filtering and pagination
// @route   GET /api/faculty
// @access  Admin, Faculty
const getFaculty = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    department,
    designation,
    search,
    sortBy = 'firstName',
    sortOrder = 'asc'
  } = req.query;

  // Build filter object
  const filter = { role: 'faculty', isActive: true };

  if (department) {
    filter['facultyInfo.department'] = department;
  }

  if (designation) {
    filter['facultyInfo.designation'] = { $regex: designation, $options: 'i' };
  }

  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { userId: { $regex: search, $options: 'i' } },
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
      { path: 'facultyInfo.department', select: 'name code' },
      { path: 'facultyInfo.subjectsTeaching', select: 'name code semester' },
      { path: 'createdBy', select: 'firstName lastName' }
    ]
  };

  const faculty = await User.paginate(filter, options);

  res.status(200).json({
    success: true,
    data: {
      faculty: faculty.docs,
      pagination: {
        currentPage: faculty.page,
        totalPages: faculty.totalPages,
        totalFaculty: faculty.totalDocs,
        hasNext: faculty.hasNextPage,
        hasPrev: faculty.hasPrevPage
      }
    }
  });
});

// @desc    Get single faculty profile
// @route   GET /api/faculty/:id
// @access  Admin, Own Faculty
const getFacultyProfile = asyncHandler(async (req, res) => {
  const faculty = await User.findOne({
    _id: req.params.id,
    role: 'faculty'
  })
  .populate('facultyInfo.department', 'name code hod')
  .populate('facultyInfo.subjectsTeaching', 'name code semester academicYear')
  .populate('createdBy', 'firstName lastName')
  .populate('updatedBy', 'firstName lastName');

  if (!faculty) {
    throw new AppError('Faculty not found', 404);
  }

  // Faculty can only view their own profile (unless admin)
  if (req.user.role === 'faculty' && faculty._id.toString() !== req.user._id.toString()) {
    throw new AppError('Access denied', 403);
  }

  res.status(200).json({
    success: true,
    data: {
      faculty
    }
  });
});

// @desc    Create new faculty
// @route   POST /api/faculty
// @access  Admin
const createFaculty = asyncHandler(async (req, res) => {
  const {
    email,
    firstName,
    lastName,
    phone,
    dateOfBirth,
    gender,
    address,
    facultyInfo
  } = req.body;

  // Check if faculty already exists
  const existingFaculty = await User.findOne({
    $or: [
      { email },
      { 'facultyInfo.employeeId': facultyInfo?.employeeId }
    ]
  });

  if (existingFaculty) {
    throw new AppError('Faculty already exists with this email or employee ID', 400);
  }

  // Generate faculty ID
  const userId = await User.generateUserId('faculty', facultyInfo?.department);

  // Create default password
  const defaultPassword = createDefaultPassword(firstName, lastName, userId);

  // Prepare faculty data
  const facultyData = {
    userId,
    email,
    password: defaultPassword,
    firstName,
    lastName,
    role: 'faculty',
    phone,
    dateOfBirth,
    gender,
    address,
    facultyInfo,
    createdBy: req.user._id,
    isActive: true
  };

  const faculty = await User.create(facultyData);
  
  // Populate department information
  await faculty.populate('facultyInfo.department', 'name code');

  res.status(201).json({
    success: true,
    message: 'Faculty created successfully',
    data: {
      faculty,
      defaultPassword
    }
  });
});

// @desc    Update faculty profile
// @route   PUT /api/faculty/:id
// @access  Admin, Own Faculty (limited fields)
const updateFaculty = asyncHandler(async (req, res) => {
  const faculty = await User.findOne({
    _id: req.params.id,
    role: 'faculty'
  });

  if (!faculty) {
    throw new AppError('Faculty not found', 404);
  }

  // Define allowed fields based on role
  let allowedFields = [];

  if (req.user.role === 'admin') {
    allowedFields = [
      'firstName', 'lastName', 'phone', 'email', 'dateOfBirth', 'gender',
      'address', 'facultyInfo', 'isActive'
    ];
  } else if (req.user.role === 'faculty' && faculty._id.toString() === req.user._id.toString()) {
    allowedFields = [
      'phone', 'address', 'facultyInfo.qualification', 'facultyInfo.specialization'
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

  const updatedFaculty = await User.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  )
  .populate('facultyInfo.department', 'name code')
  .populate('facultyInfo.subjectsTeaching', 'name code')
  .populate('updatedBy', 'firstName lastName');

  res.status(200).json({
    success: true,
    message: 'Faculty updated successfully',
    data: {
      faculty: updatedFaculty
    }
  });
});

// @desc    Delete/Deactivate faculty
// @route   DELETE /api/faculty/:id
// @access  Admin
const deleteFaculty = asyncHandler(async (req, res) => {
  const faculty = await User.findOne({
    _id: req.params.id,
    role: 'faculty'
  });

  if (!faculty) {
    throw new AppError('Faculty not found', 404);
  }

  // Soft delete - deactivate instead of removing
  faculty.isActive = false;
  faculty.updatedBy = req.user._id;
  await faculty.save();

  res.status(200).json({
    success: true,
    message: 'Faculty deactivated successfully'
  });
});

// @desc    Get faculty's assigned subjects
// @route   GET /api/faculty/:id/subjects
// @access  Admin, Own Faculty
const getFacultySubjects = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { academicYear, semester } = req.query;

  // Verify faculty exists and access permission
  const faculty = await User.findOne({ _id: id, role: 'faculty' });
  if (!faculty) {
    throw new AppError('Faculty not found', 404);
  }

  if (req.user.role === 'faculty' && faculty._id.toString() !== req.user._id.toString()) {
    throw new AppError('Access denied', 403);
  }

  // Build filter for subjects
  const filter = {
    $or: [
      { 'faculty.theory': id },
      { 'faculty.practical': id }
    ],
    isActive: true
  };

  if (academicYear) filter.academicYear = academicYear;
  if (semester) filter.semester = parseInt(semester);

  const subjects = await Subject.find(filter)
    .populate('department', 'name code')
    .sort({ semester: 1, name: 1 });

  // Get student count for each subject
  const subjectsWithStats = await Promise.all(
    subjects.map(async (subject) => {
      const studentCount = await User.countDocuments({
        role: 'student',
        'studentInfo.department': subject.department._id,
        'studentInfo.semester': subject.semester,
        'studentInfo.academicYear': subject.academicYear,
        isActive: true
      });

      // Get recent attendance count
      const recentAttendanceCount = await Attendance.countDocuments({
        subject: subject._id,
        faculty: id,
        date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
      });

      return {
        id: subject._id,
        name: subject.name,
        code: subject.code,
        department: subject.department.name,
        semester: subject.semester,
        academicYear: subject.academicYear,
        type: subject.type,
        credits: subject.credits,
        schedule: subject.schedule,
        studentCount,
        recentAttendanceMarked: recentAttendanceCount,
        role: subject.faculty.theory?.toString() === id ? 'theory' : 'practical'
      };
    })
  );

  res.status(200).json({
    success: true,
    data: {
      facultyId: id,
      subjects: subjectsWithStats,
      totalSubjects: subjectsWithStats.length
    }
  });
});

// @desc    Get students in faculty's classes
// @route   GET /api/faculty/:id/students
// @access  Admin, Own Faculty
const getFacultyStudents = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { subjectId, semester, search, page = 1, limit = 20 } = req.query;

  // Verify faculty exists and access permission
  const faculty = await User.findOne({ _id: id, role: 'faculty' });
  if (!faculty) {
    throw new AppError('Faculty not found', 404);
  }

  if (req.user.role === 'faculty' && faculty._id.toString() !== req.user._id.toString()) {
    throw new AppError('Access denied', 403);
  }

  let students = [];

  if (subjectId) {
    // Get students for specific subject
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      throw new AppError('Subject not found', 404);
    }

    // Verify faculty teaches this subject
    const teachesSubject = subject.faculty.theory?.toString() === id || 
                          subject.faculty.practical?.toString() === id;
    
    if (!teachesSubject) {
      throw new AppError('You do not teach this subject', 403);
    }

    // Build filter for students
    const filter = {
      role: 'student',
      'studentInfo.department': subject.department,
      'studentInfo.semester': subject.semester,
      'studentInfo.academicYear': subject.academicYear,
      isActive: true
    };

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { 'studentInfo.rollNumber': { $regex: search, $options: 'i' } }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { 'studentInfo.rollNumber': 1 },
      populate: [
        { path: 'studentInfo.department', select: 'name code' }
      ]
    };

    const result = await User.paginate(filter, options);
    
    // Get attendance percentage for each student in this subject
    const studentsWithAttendance = await Promise.all(
      result.docs.map(async (student) => {
        const attendanceStats = await Attendance.calculateAttendancePercentage(
          student._id,
          subjectId
        );

        return {
          id: student._id,
          userId: student.userId,
          name: student.fullName,
          rollNumber: student.studentInfo.rollNumber,
          email: student.email,
          department: student.studentInfo.department.name,
          attendance: {
            percentage: attendanceStats[0]?.attendancePercentage || 0,
            totalClasses: attendanceStats[0]?.totalClasses || 0,
            presentClasses: attendanceStats[0]?.presentClasses || 0
          }
        };
      })
    );

    students = {
      students: studentsWithAttendance,
      pagination: {
        currentPage: result.page,
        totalPages: result.totalPages,
        totalStudents: result.totalDocs
      }
    };

  } else {
    // Get all students from faculty's subjects
    const subjects = await Subject.find({
      $or: [
        { 'faculty.theory': id },
        { 'faculty.practical': id }
      ],
      isActive: true,
      ...(semester && { semester: parseInt(semester) })
    });

    const subjectIds = subjects.map(s => s._id);
    const departmentIds = [...new Set(subjects.map(s => s.department))];

    const filter = {
      role: 'student',
      'studentInfo.department': { $in: departmentIds },
      isActive: true
    };

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { 'studentInfo.rollNumber': { $regex: search, $options: 'i' } }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { 'studentInfo.rollNumber': 1 },
      populate: [
        { path: 'studentInfo.department', select: 'name code' }
      ]
    };

    const result = await User.paginate(filter, options);

    students = {
      students: result.docs.map(student => ({
        id: student._id,
        userId: student.userId,
        name: student.fullName,
        rollNumber: student.studentInfo.rollNumber,
        email: student.email,
        department: student.studentInfo.department.name,
        semester: student.studentInfo.semester
      })),
      pagination: {
        currentPage: result.page,
        totalPages: result.totalPages,
        totalStudents: result.totalDocs
      }
    };
  }

  res.status(200).json({
    success: true,
    data: {
      facultyId: id,
      subjectId,
      ...students
    }
  });
});

// @desc    Get faculty dashboard data
// @route   GET /api/faculty/:id/dashboard
// @access  Admin, Own Faculty
const getFacultyDashboard = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verify faculty exists and access permission
  const faculty = await User.findOne({ _id: id, role: 'faculty' })
    .populate('facultyInfo.department', 'name code');
  
  if (!faculty) {
    throw new AppError('Faculty not found', 404);
  }

  if (req.user.role === 'faculty' && faculty._id.toString() !== req.user._id.toString()) {
    throw new AppError('Access denied', 403);
  }

  const currentAcademicYear = await AcademicYear.getCurrentAcademicYear();

  // Get assigned subjects
  const subjects = await Subject.find({
    $or: [
      { 'faculty.theory': id },
      { 'faculty.practical': id }
    ],
    academicYear: currentAcademicYear?.year,
    isActive: true
  });

  // Get pending leave approvals
  const pendingLeaves = await Leave.find({
    'approvalWorkflow.approver': id,
    'approvalWorkflow.status': 'pending',
    status: 'pending'
  })
  .populate('student', 'firstName lastName studentInfo.rollNumber')
  .sort({ applicationDate: 1 })
  .limit(5);

  // Get recent attendance marked
  const recentAttendance = await Attendance.find({
    faculty: id,
    date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
  })
  .populate('subject', 'name code')
  .sort({ date: -1 })
  .limit(5);

  // Get recent grades added
  const recentGrades = await Grade.find({
    faculty: id,
    status: 'published'
  })
  .populate('subject', 'name code')
  .populate('student', 'firstName lastName studentInfo.rollNumber')
  .sort({ createdAt: -1 })
  .limit(5);

  // Calculate statistics
  const totalStudents = await User.countDocuments({
    role: 'student',
    'studentInfo.department': faculty.facultyInfo.department._id,
    isActive: true
  });

  const attendanceMarkedToday = await Attendance.countDocuments({
    faculty: id,
    date: {
      $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      $lte: new Date(new Date().setHours(23, 59, 59, 999))
    }
  });

  res.status(200).json({
    success: true,
    data: {
      faculty: {
        id: faculty._id,
        name: faculty.fullName,
        employeeId: faculty.facultyInfo.employeeId,
        department: faculty.facultyInfo.department,
        designation: faculty.facultyInfo.designation
      },
      statistics: {
        totalSubjects: subjects.length,
        totalStudents,
        pendingLeaveApprovals: pendingLeaves.length,
        attendanceMarkedToday
      },
      subjects: subjects.map(subject => ({
        id: subject._id,
        name: subject.name,
        code: subject.code,
        semester: subject.semester,
        type: subject.type
      })),
      pendingLeaves: pendingLeaves.map(leave => ({
        id: leave._id,
        student: leave.student,
        fromDate: leave.fromDate,
        toDate: leave.toDate,
        reason: leave.reason,
        applicationDate: leave.applicationDate
      })),
      recentAttendance: recentAttendance.map(att => ({
        subject: att.subject,
        date: att.date,
        classType: att.classType,
        studentsPresent: 1 // This would need aggregation for actual count
      })),
      recentGrades: recentGrades.map(grade => ({
        student: grade.student,
        subject: grade.subject,
        assessmentType: grade.assessmentType,
        percentage: grade.percentage,
        grade: grade.grade,
        date: grade.assessmentDate
      }))
    }
  });
});

module.exports = {
  getFaculty,
  getFacultyProfile,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  getFacultySubjects,
  getFacultyStudents,
  getFacultyDashboard
};