const express = require('express');
const {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentAttendance,
  getStudentGrades,
  getStudentLeaves,
  getStudentDashboard
} = require('../controllers/studentController');

const {
  getStudentPerformance,
  getStudentReportCard,
  checkStudentEligibility,
  getStudentAlerts,
  getStudentSchedule,
  getStudentSubjects
} = require('../controllers/studentReportsController');

const { 
  authenticate, 
  authorize, 
  adminOnly, 
  facultyOrAdmin,
  studentAccess
} = require('../middleware/auth');

const {
  studentValidationRules,
  idValidationRules,
  paginationValidationRules,
  dateRangeValidationRules,
  checkValidation
} = require('../utils/validators');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// @desc    Get all students with filtering and pagination
// @route   GET /api/students
// @access  Faculty, Admin
router.get('/', [
  facultyOrAdmin,
  paginationValidationRules(),
  checkValidation
], getStudents);

// @desc    Create new student
// @route   POST /api/students
// @access  Admin
router.post('/', [
  adminOnly,
  studentValidationRules(),
  checkValidation
], createStudent);

// @desc    Get student dashboard data
// @route   GET /api/students/:id/dashboard
// @access  Faculty, Admin, Own Student
router.get('/:id/dashboard', [
  idValidationRules(),
  checkValidation,
  studentAccess
], getStudentDashboard);

// @desc    Get student performance summary
// @route   GET /api/students/:id/performance
// @access  Faculty, Admin, Own Student
router.get('/:id/performance', [
  idValidationRules(),
  checkValidation,
  studentAccess
], getStudentPerformance);

// @desc    Get student report card
// @route   GET /api/students/:id/report-card
// @access  Faculty, Admin, Own Student
router.get('/:id/report-card', [
  idValidationRules(),
  checkValidation,
  studentAccess
], getStudentReportCard);

// @desc    Check student eligibility
// @route   GET /api/students/:id/eligibility
// @access  Faculty, Admin, Own Student
router.get('/:id/eligibility', [
  idValidationRules(),
  checkValidation,
  studentAccess
], checkStudentEligibility);

// @desc    Get student alerts
// @route   GET /api/students/:id/alerts
// @access  Faculty, Admin, Own Student
router.get('/:id/alerts', [
  idValidationRules(),
  checkValidation,
  studentAccess
], getStudentAlerts);

// @desc    Get student schedule
// @route   GET /api/students/:id/schedule
// @access  Faculty, Admin, Own Student
router.get('/:id/schedule', [
  idValidationRules(),
  checkValidation,
  studentAccess
], getStudentSchedule);

// @desc    Get student subjects
// @route   GET /api/students/:id/subjects
// @access  Faculty, Admin, Own Student
router.get('/:id/subjects', [
  idValidationRules(),
  checkValidation,
  studentAccess
], getStudentSubjects);

// @desc    Get student's attendance summary
// @route   GET /api/students/:id/attendance
// @access  Faculty, Admin, Own Student
router.get('/:id/attendance', [
  idValidationRules(),
  dateRangeValidationRules(),
  checkValidation,
  studentAccess
], getStudentAttendance);

// @desc    Get student's grades
// @route   GET /api/students/:id/grades
// @access  Faculty, Admin, Own Student
router.get('/:id/grades', [
  idValidationRules(),
  checkValidation,
  studentAccess
], getStudentGrades);

// @desc    Get student's leave applications
// @route   GET /api/students/:id/leaves
// @access  Faculty, Admin, Own Student
router.get('/:id/leaves', [
  idValidationRules(),
  paginationValidationRules(),
  checkValidation,
  studentAccess
], getStudentLeaves);

// @desc    Get single student profile
// @route   GET /api/students/:id
// @access  Faculty, Admin, Own Student
router.get('/:id', [
  idValidationRules(),
  checkValidation,
  studentAccess
], getStudent);

// @desc    Update student profile
// @route   PUT /api/students/:id
// @access  Admin, Own Student (limited fields)
router.put('/:id', [
  idValidationRules(),
  checkValidation,
  studentAccess
], updateStudent);

// @desc    Delete/Deactivate student
// @route   DELETE /api/students/:id
// @access  Admin
router.delete('/:id', [
  adminOnly,
  idValidationRules(),
  checkValidation
], deleteStudent);

module.exports = router;