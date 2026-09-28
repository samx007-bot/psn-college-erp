const express = require('express');
const {
  getFaculty,
  getFacultyProfile,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  getFacultySubjects,
  getFacultyStudents,
  getFacultyDashboard
} = require('../controllers/facultyController');

const { 
  authenticate, 
  adminOnly, 
  facultyOrAdmin
} = require('../middleware/auth');

const {
  facultyValidationRules,
  idValidationRules,
  paginationValidationRules,
  checkValidation
} = require('../utils/validators');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// @desc    Get all faculty with filtering and pagination
// @route   GET /api/faculty
// @access  Admin, Faculty
router.get('/', [
  facultyOrAdmin,
  paginationValidationRules(),
  checkValidation
], getFaculty);

// @desc    Create new faculty
// @route   POST /api/faculty
// @access  Admin
router.post('/', [
  adminOnly,
  facultyValidationRules(),
  checkValidation
], createFaculty);

// @desc    Get faculty dashboard data
// @route   GET /api/faculty/:id/dashboard
// @access  Admin, Own Faculty
router.get('/:id/dashboard', [
  idValidationRules(),
  checkValidation,
  facultyOrAdmin
], getFacultyDashboard);

// @desc    Get faculty's assigned subjects
// @route   GET /api/faculty/:id/subjects
// @access  Admin, Own Faculty
router.get('/:id/subjects', [
  idValidationRules(),
  checkValidation,
  facultyOrAdmin
], getFacultySubjects);

// @desc    Get students in faculty's classes
// @route   GET /api/faculty/:id/students
// @access  Admin, Own Faculty
router.get('/:id/students', [
  idValidationRules(),
  paginationValidationRules(),
  checkValidation,
  facultyOrAdmin
], getFacultyStudents);

// @desc    Get single faculty profile
// @route   GET /api/faculty/:id
// @access  Admin, Own Faculty
router.get('/:id', [
  idValidationRules(),
  checkValidation,
  facultyOrAdmin
], getFacultyProfile);

// @desc    Update faculty profile
// @route   PUT /api/faculty/:id
// @access  Admin, Own Faculty (limited fields)
router.put('/:id', [
  idValidationRules(),
  checkValidation,
  facultyOrAdmin
], updateFaculty);

// @desc    Delete/Deactivate faculty
// @route   DELETE /api/faculty/:id
// @access  Admin
router.delete('/:id', [
  adminOnly,
  idValidationRules(),
  checkValidation
], deleteFaculty);

module.exports = router;