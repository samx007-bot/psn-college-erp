const { body, param, query, validationResult } = require('express-validator');

// Custom validation function to check validation result
const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }
  next();
};

// User validation rules
const userValidationRules = () => {
  return [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('firstName')
      .notEmpty()
      .trim()
      .withMessage('First name is required'),
    body('lastName')
      .notEmpty()
      .trim()
      .withMessage('Last name is required'),
    body('role')
      .isIn(['student', 'faculty', 'admin'])
      .withMessage('Role must be student, faculty, or admin')
  ];
};

// Student-specific validation
const studentValidationRules = () => {
  return [
    ...userValidationRules(),
    body('studentInfo.rollNumber')
      .optional()
      .notEmpty()
      .withMessage('Roll number is required for students'),
    body('studentInfo.admissionYear')
      .optional()
      .isInt({ min: 2020, max: new Date().getFullYear() + 1 })
      .withMessage('Please provide a valid admission year'),
    body('studentInfo.semester')
      .optional()
      .isInt({ min: 1, max: 8 })
      .withMessage('Semester must be between 1 and 8')
  ];
};

// Faculty-specific validation
const facultyValidationRules = () => {
  return [
    ...userValidationRules(),
    body('facultyInfo.employeeId')
      .optional()
      .notEmpty()
      .withMessage('Employee ID is required for faculty'),
    body('facultyInfo.designation')
      .optional()
      .notEmpty()
      .withMessage('Designation is required for faculty')
  ];
};

// Login validation
const loginValidationRules = () => {
  return [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ];
};

// Attendance validation
const attendanceValidationRules = () => {
  return [
    body('student')
      .isMongoId()
      .withMessage('Invalid student ID'),
    body('subject')
      .isMongoId()
      .withMessage('Invalid subject ID'),
    body('status')
      .isIn(['present', 'absent', 'late', 'excused'])
      .withMessage('Status must be present, absent, late, or excused'),
    body('classType')
      .isIn(['theory', 'practical', 'tutorial'])
      .withMessage('Class type must be theory, practical, or tutorial'),
    body('date')
      .optional()
      .isISO8601()
      .withMessage('Please provide a valid date')
  ];
};

// Leave validation
const leaveValidationRules = () => {
  return [
    body('leaveType')
      .isIn(['sick', 'personal', 'emergency', 'family', 'medical', 'academic', 'other'])
      .withMessage('Invalid leave type'),
    body('fromDate')
      .isISO8601()
      .withMessage('Please provide a valid from date'),
    body('toDate')
      .isISO8601()
      .withMessage('Please provide a valid to date')
      .custom((toDate, { req }) => {
        if (new Date(toDate) <= new Date(req.body.fromDate)) {
          throw new Error('To date must be after from date');
        }
        return true;
      }),
    body('reason')
      .notEmpty()
      .isLength({ min: 10, max: 500 })
      .withMessage('Reason must be between 10 and 500 characters')
  ];
};

// Grade validation
const gradeValidationRules = () => {
  return [
    body('student')
      .isMongoId()
      .withMessage('Invalid student ID'),
    body('subject')
      .isMongoId()
      .withMessage('Invalid subject ID'),
    body('assessmentType')
      .isIn(['internal', 'external', 'assignment', 'project', 'practical', 'quiz', 'mid_term', 'final'])
      .withMessage('Invalid assessment type'),
    body('maxMarks')
      .isFloat({ min: 1 })
      .withMessage('Maximum marks must be greater than 0'),
    body('obtainedMarks')
      .isFloat({ min: 0 })
      .withMessage('Obtained marks must be 0 or greater')
      .custom((obtainedMarks, { req }) => {
        if (obtainedMarks > req.body.maxMarks) {
          throw new Error('Obtained marks cannot exceed maximum marks');
        }
        return true;
      }),
    body('assessmentDate')
      .isISO8601()
      .withMessage('Please provide a valid assessment date')
  ];
};

// Subject validation
const subjectValidationRules = () => {
  return [
    body('name')
      .notEmpty()
      .trim()
      .withMessage('Subject name is required'),
    body('code')
      .notEmpty()
      .trim()
      .withMessage('Subject code is required'),
    body('department')
      .isMongoId()
      .withMessage('Invalid department ID'),
    body('semester')
      .isInt({ min: 1, max: 8 })
      .withMessage('Semester must be between 1 and 8'),
    body('credits.total')
      .isFloat({ min: 1 })
      .withMessage('Total credits must be greater than 0')
  ];
};

// Department validation
const departmentValidationRules = () => {
  return [
    body('name')
      .notEmpty()
      .trim()
      .withMessage('Department name is required'),
    body('code')
      .notEmpty()
      .trim()
      .withMessage('Department code is required')
      .isLength({ min: 2, max: 10 })
      .withMessage('Department code must be between 2 and 10 characters')
  ];
};

// ID parameter validation
const idValidationRules = () => {
  return [
    param('id')
      .isMongoId()
      .withMessage('Invalid ID format')
  ];
};

// Pagination validation
const paginationValidationRules = () => {
  return [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ];
};

// Date range validation
const dateRangeValidationRules = () => {
  return [
    query('fromDate')
      .optional()
      .isISO8601()
      .withMessage('Please provide a valid from date'),
    query('toDate')
      .optional()
      .isISO8601()
      .withMessage('Please provide a valid to date')
      .custom((toDate, { req }) => {
        if (req.query.fromDate && new Date(toDate) <= new Date(req.query.fromDate)) {
          throw new Error('To date must be after from date');
        }
        return true;
      })
  ];
};

module.exports = {
  checkValidation,
  userValidationRules,
  studentValidationRules,
  facultyValidationRules,
  loginValidationRules,
  attendanceValidationRules,
  leaveValidationRules,
  gradeValidationRules,
  subjectValidationRules,
  departmentValidationRules,
  idValidationRules,
  paginationValidationRules,
  dateRangeValidationRules
};