const { Subject, Department, User, AcademicYear } = require('../models');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// @desc    Get all subjects with filtering and pagination
// @route   GET /api/admin/subjects
// @access  Admin, Faculty
const getSubjects = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    department,
    semester,
    academicYear,
    type,
    search,
    sortBy = 'name',
    sortOrder = 'asc'
  } = req.query;

  // Build filter object
  const filter = { isActive: true };

  if (department) {
    filter.department = department;
  }

  if (semester) {
    filter.semester = parseInt(semester);
  }

  if (academicYear) {
    filter.academicYear = academicYear;
  }

  if (type) {
    filter.type = type;
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } }
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
      { path: 'department', select: 'name code' },
      { path: 'faculty.theory', select: 'firstName lastName email' },
      { path: 'faculty.practical', select: 'firstName lastName email' }
    ]
  };

  const subjects = await Subject.paginate(filter, options);

  res.status(200).json({
    success: true,
    data: {
      subjects: subjects.docs,
      pagination: {
        currentPage: subjects.page,
        totalPages: subjects.totalPages,
        totalSubjects: subjects.totalDocs,
        hasNext: subjects.hasNextPage,
        hasPrev: subjects.hasPrevPage
      }
    }
  });
});

// @desc    Get single subject
// @route   GET /api/admin/subjects/:id
// @access  Admin, Faculty
const getSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id)
    .populate('department', 'name code hod')
    .populate('faculty.theory', 'firstName lastName email facultyInfo.designation')
    .populate('faculty.practical', 'firstName lastName email facultyInfo.designation')
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName');

  if (!subject) {
    throw new AppError('Subject not found', 404);
  }

  res.status(200).json({
    success: true,
    data: {
      subject
    }
  });
});

// @desc    Create new subject
// @route   POST /api/admin/subjects
// @access  Admin
const createSubject = asyncHandler(async (req, res) => {
  const {
    name,
    code,
    description,
    department,
    semester,
    academicYear,
    credits,
    type,
    faculty,
    schedule,
    syllabus,
    attendanceConfig
  } = req.body;

  // Check if subject already exists
  const existingSubject = await Subject.findOne({
    $or: [
      { 
        name: { $regex: `^${name}$`, $options: 'i' },
        department,
        semester,
        academicYear
      },
      { 
        code: { $regex: `^${code}$`, $options: 'i' },
        academicYear
      }
    ]
  });

  if (existingSubject) {
    throw new AppError('Subject already exists with this name or code for the given department/semester/year', 400);
  }

  // Validate department
  const dept = await Department.findById(department);
  if (!dept) {
    throw new AppError('Department not found', 400);
  }

  // Validate faculty if provided
  if (faculty) {
    if (faculty.theory) {
      const theoryFaculty = await User.findOne({ 
        _id: faculty.theory, 
        role: 'faculty', 
        isActive: true 
      });
      if (!theoryFaculty) {
        throw new AppError('Invalid theory faculty member', 400);
      }
    }

    if (faculty.practical) {
      const practicalFaculty = await User.findOne({ 
        _id: faculty.practical, 
        role: 'faculty', 
        isActive: true 
      });
      if (!practicalFaculty) {
        throw new AppError('Invalid practical faculty member', 400);
      }
    }
  }

  // Get current academic year if not provided
  const currentAcademicYear = academicYear || (await AcademicYear.getCurrentAcademicYear())?.year;

  const subject = await Subject.create({
    name,
    code: code.toUpperCase(),
    description,
    department,
    semester,
    academicYear: currentAcademicYear,
    credits,
    type: type || 'core',
    faculty,
    schedule: schedule || [],
    syllabus,
    attendanceConfig: {
      minimumPercentage: attendanceConfig?.minimumPercentage || 75,
      totalClasses: attendanceConfig?.totalClasses || 0,
      isAttendanceMandatory: attendanceConfig?.isAttendanceMandatory !== false
    },
    createdBy: req.user._id
  });

  // Populate the created subject
  await subject.populate([
    { path: 'department', select: 'name code' },
    { path: 'faculty.theory', select: 'firstName lastName email' },
    { path: 'faculty.practical', select: 'firstName lastName email' }
  ]);

  res.status(201).json({
    success: true,
    message: 'Subject created successfully',
    data: {
      subject
    }
  });
});

// @desc    Update subject
// @route   PUT /api/admin/subjects/:id
// @access  Admin
const updateSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id);
  
  if (!subject) {
    throw new AppError('Subject not found', 404);
  }

  const {
    name,
    code,
    description,
    department,
    semester,
    academicYear,
    credits,
    type,
    faculty,
    schedule,
    syllabus,
    attendanceConfig,
    isActive
  } = req.body;

  // Check for duplicate name/code if they are being updated
  if (name || code) {
    const existingSubject = await Subject.findOne({
      _id: { $ne: req.params.id },
      $or: [
        ...(name ? [{
          name: { $regex: `^${name}$`, $options: 'i' },
          department: department || subject.department,
          semester: semester || subject.semester,
          academicYear: academicYear || subject.academicYear
        }] : []),
        ...(code ? [{
          code: { $regex: `^${code}$`, $options: 'i' },
          academicYear: academicYear || subject.academicYear
        }] : [])
      ]
    });

    if (existingSubject) {
      throw new AppError('Another subject already exists with this name or code', 400);
    }
  }

  // Validate department if provided
  if (department && department !== subject.department.toString()) {
    const dept = await Department.findById(department);
    if (!dept) {
      throw new AppError('Department not found', 400);
    }
  }

  // Validate faculty if provided
  if (faculty) {
    if (faculty.theory) {
      const theoryFaculty = await User.findOne({ 
        _id: faculty.theory, 
        role: 'faculty', 
        isActive: true 
      });
      if (!theoryFaculty) {
        throw new AppError('Invalid theory faculty member', 400);
      }
    }

    if (faculty.practical) {
      const practicalFaculty = await User.findOne({ 
        _id: faculty.practical, 
        role: 'faculty', 
        isActive: true 
      });
      if (!practicalFaculty) {
        throw new AppError('Invalid practical faculty member', 400);
      }
    }
  }

  // Update subject
  const updateData = {
    ...(name && { name }),
    ...(code && { code: code.toUpperCase() }),
    ...(description !== undefined && { description }),
    ...(department && { department }),
    ...(semester && { semester }),
    ...(academicYear && { academicYear }),
    ...(credits && { credits }),
    ...(type && { type }),
    ...(faculty && { faculty }),
    ...(schedule && { schedule }),
    ...(syllabus && { syllabus }),
    ...(attendanceConfig && { 
      attendanceConfig: {
        minimumPercentage: attendanceConfig.minimumPercentage || subject.attendanceConfig.minimumPercentage,
        totalClasses: attendanceConfig.totalClasses || subject.attendanceConfig.totalClasses,
        isAttendanceMandatory: attendanceConfig.isAttendanceMandatory !== undefined 
          ? attendanceConfig.isAttendanceMandatory 
          : subject.attendanceConfig.isAttendanceMandatory
      }
    }),
    ...(isActive !== undefined && { isActive }),
    updatedBy: req.user._id
  };

  const updatedSubject = await Subject.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  )
  .populate('department', 'name code')
  .populate('faculty.theory', 'firstName lastName email')
  .populate('faculty.practical', 'firstName lastName email')
  .populate('updatedBy', 'firstName lastName');

  res.status(200).json({
    success: true,
    message: 'Subject updated successfully',
    data: {
      subject: updatedSubject
    }
  });
});

// @desc    Delete subject
// @route   DELETE /api/admin/subjects/:id
// @access  Admin
const deleteSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id);
  
  if (!subject) {
    throw new AppError('Subject not found', 404);
  }

  // Check if subject has associated attendance or grades
  const { Attendance, Grade } = require('../models');
  const [hasAttendance, hasGrades] = await Promise.all([
    Attendance.exists({ subject: subject._id }),
    Grade.exists({ subject: subject._id })
  ]);

  if (hasAttendance || hasGrades) {
    throw new AppError(
      'Cannot delete subject with existing attendance or grade records. Please deactivate instead.',
      400
    );
  }

  await Subject.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Subject deleted successfully'
  });
});

// @desc    Assign faculty to subject
// @route   PUT /api/admin/subjects/:id/assign-faculty
// @access  Admin
const assignFaculty = asyncHandler(async (req, res) => {
  const { theoryFaculty, practicalFaculty } = req.body;
  
  const subject = await Subject.findById(req.params.id);
  if (!subject) {
    throw new AppError('Subject not found', 404);
  }

  // Validate theory faculty if provided
  if (theoryFaculty) {
    const faculty = await User.findOne({
      _id: theoryFaculty,
      role: 'faculty',
      isActive: true
    });
    if (!faculty) {
      throw new AppError('Invalid theory faculty member', 400);
    }
    subject.faculty.theory = theoryFaculty;
  }

  // Validate practical faculty if provided
  if (practicalFaculty) {
    const faculty = await User.findOne({
      _id: practicalFaculty,
      role: 'faculty',
      isActive: true
    });
    if (!faculty) {
      throw new AppError('Invalid practical faculty member', 400);
    }
    subject.faculty.practical = practicalFaculty;
  }

  subject.updatedBy = req.user._id;
  await subject.save();

  // Update faculty's subject teaching list
  if (theoryFaculty) {
    await User.findByIdAndUpdate(theoryFaculty, {
      $addToSet: { 'facultyInfo.subjectsTeaching': subject._id }
    });
  }

  if (practicalFaculty) {
    await User.findByIdAndUpdate(practicalFaculty, {
      $addToSet: { 'facultyInfo.subjectsTeaching': subject._id }
    });
  }

  await subject.populate([
    { path: 'faculty.theory', select: 'firstName lastName email' },
    { path: 'faculty.practical', select: 'firstName lastName email' }
  ]);

  res.status(200).json({
    success: true,
    message: 'Faculty assigned to subject successfully',
    data: {
      subject
    }
  });
});

// @desc    Get subjects by department and semester
// @route   GET /api/admin/subjects/department/:departmentId/semester/:semester
// @access  Admin, Faculty
const getSubjectsByDepartmentAndSemester = asyncHandler(async (req, res) => {
  const { departmentId, semester } = req.params;
  const { academicYear } = req.query;

  // Validate department
  const department = await Department.findById(departmentId);
  if (!department) {
    throw new AppError('Department not found', 404);
  }

  // Get current academic year if not provided
  const currentAcademicYear = academicYear || (await AcademicYear.getCurrentAcademicYear())?.year;

  const subjects = await Subject.find({
    department: departmentId,
    semester: parseInt(semester),
    academicYear: currentAcademicYear,
    isActive: true
  })
  .populate('faculty.theory', 'firstName lastName email')
  .populate('faculty.practical', 'firstName lastName email')
  .sort({ name: 1 });

  // Calculate total credits
  const totalCredits = subjects.reduce((sum, subject) => sum + subject.credits.total, 0);

  res.status(200).json({
    success: true,
    data: {
      department: {
        id: department._id,
        name: department.name,
        code: department.code
      },
      semester: parseInt(semester),
      academicYear: currentAcademicYear,
      subjects,
      statistics: {
        totalSubjects: subjects.length,
        totalCredits,
        subjectTypes: subjects.reduce((acc, subject) => {
          acc[subject.type] = (acc[subject.type] || 0) + 1;
          return acc;
        }, {})
      }
    }
  });
});

// @desc    Copy subjects from previous year
// @route   POST /api/admin/subjects/copy
// @access  Admin
const copySubjects = asyncHandler(async (req, res) => {
  const { 
    sourceDepartment, 
    sourceSemester, 
    sourceAcademicYear, 
    targetAcademicYear,
    targetDepartment,
    targetSemester
  } = req.body;

  // Validate source subjects exist
  const sourceSubjects = await Subject.find({
    department: sourceDepartment,
    semester: sourceSemester,
    academicYear: sourceAcademicYear,
    isActive: true
  });

  if (sourceSubjects.length === 0) {
    throw new AppError('No subjects found for the specified source criteria', 404);
  }

  // Check if target subjects already exist
  const existingTargetSubjects = await Subject.find({
    department: targetDepartment || sourceDepartment,
    semester: targetSemester || sourceSemester,
    academicYear: targetAcademicYear
  });

  if (existingTargetSubjects.length > 0) {
    throw new AppError('Subjects already exist for the target criteria', 400);
  }

  const copiedSubjects = [];
  const errors = [];

  // Copy each subject
  for (const sourceSubject of sourceSubjects) {
    try {
      const newSubject = new Subject({
        name: sourceSubject.name,
        code: sourceSubject.code,
        description: sourceSubject.description,
        department: targetDepartment || sourceSubject.department,
        semester: targetSemester || sourceSubject.semester,
        academicYear: targetAcademicYear,
        credits: sourceSubject.credits,
        type: sourceSubject.type,
        schedule: sourceSubject.schedule,
        syllabus: sourceSubject.syllabus,
        attendanceConfig: sourceSubject.attendanceConfig,
        createdBy: req.user._id
        // Note: Faculty assignments are not copied to avoid conflicts
      });

      await newSubject.save();
      copiedSubjects.push(newSubject);
    } catch (error) {
      errors.push({
        subject: sourceSubject.name,
        error: error.message
      });
    }
  }

  res.status(200).json({
    success: true,
    message: `${copiedSubjects.length} subjects copied successfully`,
    data: {
      copiedCount: copiedSubjects.length,
      errorCount: errors.length,
      copiedSubjects: copiedSubjects.map(s => ({
        id: s._id,
        name: s.name,
        code: s.code
      })),
      errors
    }
  });
});

module.exports = {
  getSubjects,
  getSubject,
  createSubject,
  updateSubject,
  deleteSubject,
  assignFaculty,
  getSubjectsByDepartmentAndSemester,
  copySubjects
};