const express = require('express');
const {
  markAttendance,
  getClassAttendance,
  getAttendanceSummary,
  updateAttendanceRecord
} = require('../controllers/facultyAttendanceController');

const { 
  authenticate, 
  facultyOrAdmin
} = require('../middleware/auth');

const {
  attendanceValidationRules,
  idValidationRules,
  paginationValidationRules,
  dateRangeValidationRules,
  checkValidation
} = require('../utils/validators');
const { body } = require('express-validator');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);
router.use(facultyOrAdmin);

// @desc    Mark attendance for a class
// @route   POST /api/faculty/attendance/mark
// @access  Faculty
router.post('/mark', [
  body('subjectId')
    .isMongoId()
    .withMessage('Invalid subject ID'),
  body('date')
    .isISO8601()
    .withMessage('Please provide a valid date'),
  body('classType')
    .isIn(['theory', 'practical', 'tutorial'])
    .withMessage('Class type must be theory, practical, or tutorial'),
  body('attendanceData')
    .isArray({ min: 1 })
    .withMessage('Attendance data must be a non-empty array'),
  body('attendanceData.*.studentId')
    .isMongoId()
    .withMessage('Invalid student ID'),
  body('attendanceData.*.status')
    .isIn(['present', 'absent', 'late', 'excused'])
    .withMessage('Status must be present, absent, late, or excused'),
  checkValidation
], markAttendance);

// @desc    Get attendance summary for subject
// @route   GET /api/faculty/attendance/:subjectId/summary
// @access  Faculty
router.get('/:subjectId/summary', [
  idValidationRules(),
  dateRangeValidationRules(),
  checkValidation
], getAttendanceSummary);

// @desc    Get attendance for a specific class
// @route   GET /api/faculty/attendance/:subjectId
// @access  Faculty
router.get('/:subjectId', [
  idValidationRules(),
  paginationValidationRules(),
  checkValidation
], getClassAttendance);

// @desc    Update single attendance record
// @route   PUT /api/faculty/attendance/:attendanceId
// @access  Faculty
router.put('/:attendanceId', [
  idValidationRules(),
  body('status')
    .isIn(['present', 'absent', 'late', 'excused'])
    .withMessage('Status must be present, absent, late, or excused'),
  checkValidation
], updateAttendanceRecord);

module.exports = router;