const { Department, User, Subject } = require('../models');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// @desc    Get all departments with pagination
// @route   GET /api/admin/departments
// @access  Admin, Faculty
const getDepartments = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search,
    isActive,
    sortBy = 'name',
    sortOrder = 'asc'
  } = req.query;

  // Build filter object
  const filter = {};

  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
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
      { path: 'hod', select: 'firstName lastName email' },
      { path: 'faculty', select: 'firstName lastName email facultyInfo.designation' }
    ]
  };

  const departments = await Department.paginate(filter, options);

  // Add statistics for each department
  const departmentsWithStats = await Promise.all(
    departments.docs.map(async (dept) => {
      const studentCount = await User.countDocuments({
        role: 'student',
        'studentInfo.department': dept._id,
        isActive: true
      });

      const subjectCount = await Subject.countDocuments({
        department: dept._id,
        isActive: true
      });

      return {
        ...dept.toObject(),
        statistics: {
          totalStudents: studentCount,
          totalFaculty: dept.faculty ? dept.faculty.length : 0,
          totalSubjects: subjectCount
        }
      };
    })
  );

  res.status(200).json({
    success: true,
    data: {
      departments: departmentsWithStats,
      pagination: {
        currentPage: departments.page,
        totalPages: departments.totalPages,
        totalDepartments: departments.totalDocs,
        hasNext: departments.hasNextPage,
        hasPrev: departments.hasPrevPage
      }
    }
  });
});

// @desc    Get single department
// @route   GET /api/admin/departments/:id
// @access  Admin, Faculty
const getDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id)
    .populate('hod', 'firstName lastName email facultyInfo')
    .populate('faculty', 'firstName lastName email facultyInfo.designation facultyInfo.specialization')
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName');

  if (!department) {
    throw new AppError('Department not found', 404);
  }

  // Get department statistics
  const statistics = await Promise.all([
    User.countDocuments({
      role: 'student',
      'studentInfo.department': department._id,
      isActive: true
    }),
    Subject.countDocuments({
      department: department._id,
      isActive: true
    }),
    User.aggregate([
      {
        $match: {
          role: 'student',
          'studentInfo.department': department._id,
          isActive: true
        }
      },
      {
        $group: {
          _id: '$studentInfo.semester',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])
  ]);

  const semesterWiseDistribution = statistics[2].reduce((acc, curr) => {
    acc[`semester${curr._id}`] = curr.count;
    return acc;
  }, {});

  res.status(200).json({
    success: true,
    data: {
      department,
      statistics: {
        totalStudents: statistics[0],
        totalSubjects: statistics[1],
        semesterWiseDistribution
      }
    }
  });
});

// @desc    Create new department
// @route   POST /api/admin/departments
// @access  Admin
const createDepartment = asyncHandler(async (req, res) => {
  const {
    name,
    code,
    description,
    hod,
    totalSemesters,
    establishedYear,
    office,
    accreditation
  } = req.body;

  // Check if department already exists
  const existingDepartment = await Department.findOne({
    $or: [
      { name: { $regex: `^${name}$`, $options: 'i' } },
      { code: { $regex: `^${code}$`, $options: 'i' } }
    ]
  });

  if (existingDepartment) {
    throw new AppError('Department already exists with this name or code', 400);
  }

  // Validate HOD if provided
  if (hod) {
    const hodUser = await User.findOne({ _id: hod, role: 'faculty', isActive: true });
    if (!hodUser) {
      throw new AppError('Invalid HOD. Must be an active faculty member', 400);
    }
  }

  const department = await Department.create({
    name,
    code: code.toUpperCase(),
    description,
    hod,
    totalSemesters: totalSemesters || 8,
    establishedYear,
    office,
    accreditation,
    createdBy: req.user._id
  });

  // Populate the created department
  await department.populate('hod', 'firstName lastName email');

  res.status(201).json({
    success: true,
    message: 'Department created successfully',
    data: {
      department
    }
  });
});

// @desc    Update department
// @route   PUT /api/admin/departments/:id
// @access  Admin
const updateDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  
  if (!department) {
    throw new AppError('Department not found', 404);
  }

  const {
    name,
    code,
    description,
    hod,
    totalSemesters,
    establishedYear,
    office,
    accreditation,
    isActive
  } = req.body;

  // Check for duplicate name/code if they are being updated
  if (name || code) {
    const existingDepartment = await Department.findOne({
      _id: { $ne: req.params.id },
      $or: [
        ...(name ? [{ name: { $regex: `^${name}$`, $options: 'i' } }] : []),
        ...(code ? [{ code: { $regex: `^${code}$`, $options: 'i' } }] : [])
      ]
    });

    if (existingDepartment) {
      throw new AppError('Another department already exists with this name or code', 400);
    }
  }

  // Validate HOD if provided
  if (hod) {
    const hodUser = await User.findOne({ _id: hod, role: 'faculty', isActive: true });
    if (!hodUser) {
      throw new AppError('Invalid HOD. Must be an active faculty member', 400);
    }
  }

  // Update department
  const updateData = {
    ...(name && { name }),
    ...(code && { code: code.toUpperCase() }),
    ...(description !== undefined && { description }),
    ...(hod !== undefined && { hod }),
    ...(totalSemesters && { totalSemesters }),
    ...(establishedYear && { establishedYear }),
    ...(office && { office }),
    ...(accreditation && { accreditation }),
    ...(isActive !== undefined && { isActive }),
    updatedBy: req.user._id
  };

  const updatedDepartment = await Department.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  )
  .populate('hod', 'firstName lastName email')
  .populate('faculty', 'firstName lastName email')
  .populate('updatedBy', 'firstName lastName');

  res.status(200).json({
    success: true,
    message: 'Department updated successfully',
    data: {
      department: updatedDepartment
    }
  });
});

// @desc    Delete department
// @route   DELETE /api/admin/departments/:id
// @access  Admin
const deleteDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  
  if (!department) {
    throw new AppError('Department not found', 404);
  }

  // Check if department has associated users or subjects
  const [hasStudents, hasFaculty, hasSubjects] = await Promise.all([
    User.exists({ 'studentInfo.department': department._id }),
    User.exists({ 'facultyInfo.department': department._id }),
    Subject.exists({ department: department._id })
  ]);

  if (hasStudents || hasFaculty || hasSubjects) {
    throw new AppError(
      'Cannot delete department with existing students, faculty, or subjects. Please deactivate instead.',
      400
    );
  }

  await Department.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Department deleted successfully'
  });
});

// @desc    Assign faculty to department
// @route   PUT /api/admin/departments/:id/assign-faculty
// @access  Admin
const assignFaculty = asyncHandler(async (req, res) => {
  const { facultyIds } = req.body;
  
  if (!Array.isArray(facultyIds) || facultyIds.length === 0) {
    throw new AppError('Faculty IDs array is required', 400);
  }

  const department = await Department.findById(req.params.id);
  if (!department) {
    throw new AppError('Department not found', 404);
  }

  // Validate faculty members
  const facultyMembers = await User.find({
    _id: { $in: facultyIds },
    role: 'faculty',
    isActive: true
  });

  if (facultyMembers.length !== facultyIds.length) {
    throw new AppError('One or more faculty IDs are invalid or inactive', 400);
  }

  // Update department faculty list
  department.faculty = [...new Set([...department.faculty, ...facultyIds])]; // Remove duplicates
  department.updatedBy = req.user._id;
  await department.save();

  // Update faculty department info
  await User.updateMany(
    { _id: { $in: facultyIds } },
    { 
      'facultyInfo.department': department._id,
      updatedBy: req.user._id
    }
  );

  await department.populate('faculty', 'firstName lastName email facultyInfo.designation');

  res.status(200).json({
    success: true,
    message: `${facultyMembers.length} faculty members assigned to department`,
    data: {
      department
    }
  });
});

// @desc    Remove faculty from department
// @route   PUT /api/admin/departments/:id/remove-faculty
// @access  Admin
const removeFaculty = asyncHandler(async (req, res) => {
  const { facultyIds } = req.body;
  
  if (!Array.isArray(facultyIds) || facultyIds.length === 0) {
    throw new AppError('Faculty IDs array is required', 400);
  }

  const department = await Department.findById(req.params.id);
  if (!department) {
    throw new AppError('Department not found', 404);
  }

  // Remove faculty from department
  department.faculty = department.faculty.filter(
    facultyId => !facultyIds.includes(facultyId.toString())
  );
  department.updatedBy = req.user._id;
  await department.save();

  // Clear department info from faculty
  await User.updateMany(
    { _id: { $in: facultyIds } },
    { 
      $unset: { 'facultyInfo.department': 1 },
      updatedBy: req.user._id
    }
  );

  await department.populate('faculty', 'firstName lastName email facultyInfo.designation');

  res.status(200).json({
    success: true,
    message: `${facultyIds.length} faculty members removed from department`,
    data: {
      department
    }
  });
});

// @desc    Get department statistics
// @route   GET /api/admin/departments/:id/statistics
// @access  Admin, Faculty
const getDepartmentStatistics = asyncHandler(async (req, res) => {
  const { period = '30' } = req.query; // days
  const periodDays = parseInt(period);
  const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  const department = await Department.findById(req.params.id);
  if (!department) {
    throw new AppError('Department not found', 404);
  }

  // Student statistics
  const studentStats = await User.aggregate([
    {
      $match: {
        role: 'student',
        'studentInfo.department': department._id,
        isActive: true
      }
    },
    {
      $group: {
        _id: {
          semester: '$studentInfo.semester',
          batch: '$studentInfo.batch'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.semester',
        totalStudents: { $sum: '$count' },
        batches: {
          $push: {
            batch: '$_id.batch',
            count: '$count'
          }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Faculty statistics
  const facultyStats = await User.aggregate([
    {
      $match: {
        role: 'faculty',
        'facultyInfo.department': department._id,
        isActive: true
      }
    },
    {
      $group: {
        _id: '$facultyInfo.designation',
        count: { $sum: 1 }
      }
    }
  ]);

  // Subject statistics
  const subjectStats = await Subject.aggregate([
    {
      $match: {
        department: department._id,
        isActive: true
      }
    },
    {
      $group: {
        _id: {
          semester: '$semester',
          type: '$type'
        },
        count: { $sum: 1 },
        totalCredits: { $sum: '$credits.total' }
      }
    },
    {
      $group: {
        _id: '$_id.semester',
        totalSubjects: { $sum: '$count' },
        totalCredits: { $sum: '$totalCredits' },
        subjectTypes: {
          $push: {
            type: '$_id.type',
            count: '$count'
          }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  res.status(200).json({
    success: true,
    data: {
      department: {
        id: department._id,
        name: department.name,
        code: department.code
      },
      period: `${periodDays} days`,
      students: {
        semesterWise: studentStats,
        total: studentStats.reduce((sum, sem) => sum + sem.totalStudents, 0)
      },
      faculty: {
        designationWise: facultyStats,
        total: facultyStats.reduce((sum, des) => sum + des.count, 0)
      },
      subjects: {
        semesterWise: subjectStats,
        total: subjectStats.reduce((sum, sem) => sum + sem.totalSubjects, 0),
        totalCredits: subjectStats.reduce((sum, sem) => sum + sem.totalCredits, 0)
      }
    }
  });
});

module.exports = {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  assignFaculty,
  removeFaculty,
  getDepartmentStatistics
};