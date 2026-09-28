const express = require('express');
const {
  getAdminDashboard,
  getAllUsers,
  createBulkUsers,
  updateUserStatus,
  deleteUser,
  resetUserPassword,
  getSystemStatistics,
  exportSystemData
} = require('../controllers/adminController');

const {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  assignFaculty,
  removeFaculty,
  getDepartmentStatistics
} = require('../controllers/departmentController');

const {
  getSubjects,
  getSubject,
  createSubject,
  updateSubject,
  deleteSubject,
  assignFaculty: assignSubjectFaculty,
  getSubjectsByDepartmentAndSemester,
  copySubjects
} = require('../controllers/subjectController');

const { 
  authenticate, 
  adminOnly
} = require('../middleware/auth');

const {
  departmentValidationRules,
  subjectValidationRules,
  idValidationRules,
  paginationValidationRules,
  checkValidation
} = require('../utils/validators');
const { body } = require('express-validator');

const router = express.Router();

// Apply authentication and admin-only access to all routes
router.use(authenticate);
router.use(adminOnly);

// ============= ADMIN DASHBOARD & SYSTEM =============

// @desc    Get admin dashboard
// @route   GET /api/admin/dashboard
// @access  Admin
router.get('/dashboard', getAdminDashboard);

// @desc    Get system statistics
// @route   GET /api/admin/statistics
// @access  Admin
router.get('/statistics', getSystemStatistics);

// @desc    Export system data
// @route   GET /api/admin/export
// @access  Admin
router.get('/export', exportSystemData);

// ============= USER MANAGEMENT =============

// @desc    Get all users with advanced filtering
// @route   GET /api/admin/users
// @access  Admin
router.get('/users', [
  paginationValidationRules(),
  checkValidation
], getAllUsers);

// @desc    Create bulk users from CSV data
// @route   POST /api/admin/users/bulk
// @access  Admin
router.post('/users/bulk', [
  body('users')
    .isArray({ min: 1 })
    .withMessage('Users must be a non-empty array'),
  checkValidation
], createBulkUsers);

// @desc    Update user status
// @route   PUT /api/admin/users/:id/status
// @access  Admin
router.put('/users/:id/status', [
  idValidationRules(),
  body('isActive')
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
  checkValidation
], updateUserStatus);

// @desc    Reset user password
// @route   PUT /api/admin/users/:id/reset-password
// @access  Admin
router.put('/users/:id/reset-password', [
  idValidationRules(),
  checkValidation
], resetUserPassword);

// @desc    Delete user permanently
// @route   DELETE /api/admin/users/:id
// @access  Admin
router.delete('/users/:id', [
  idValidationRules(),
  checkValidation
], deleteUser);

// ============= DEPARTMENT MANAGEMENT =============

// @desc    Get all departments
// @route   GET /api/admin/departments
// @access  Admin
router.get('/departments', [
  paginationValidationRules(),
  checkValidation
], getDepartments);

// @desc    Create new department
// @route   POST /api/admin/departments
// @access  Admin
router.post('/departments', [
  departmentValidationRules(),
  checkValidation
], createDepartment);

// @desc    Get department statistics
// @route   GET /api/admin/departments/:id/statistics
// @access  Admin
router.get('/departments/:id/statistics', [
  idValidationRules(),
  checkValidation
], getDepartmentStatistics);

// @desc    Assign faculty to department
// @route   PUT /api/admin/departments/:id/assign-faculty
// @access  Admin
router.put('/departments/:id/assign-faculty', [
  idValidationRules(),
  body('facultyIds')
    .isArray({ min: 1 })
    .withMessage('Faculty IDs must be a non-empty array'),
  body('facultyIds.*')
    .isMongoId()
    .withMessage('Invalid faculty ID'),
  checkValidation
], assignFaculty);

// @desc    Remove faculty from department
// @route   PUT /api/admin/departments/:id/remove-faculty
// @access  Admin
router.put('/departments/:id/remove-faculty', [
  idValidationRules(),
  body('facultyIds')
    .isArray({ min: 1 })
    .withMessage('Faculty IDs must be a non-empty array'),
  body('facultyIds.*')
    .isMongoId()
    .withMessage('Invalid faculty ID'),
  checkValidation
], removeFaculty);

// @desc    Get single department
// @route   GET /api/admin/departments/:id
// @access  Admin
router.get('/departments/:id', [
  idValidationRules(),
  checkValidation
], getDepartment);

// @desc    Update department
// @route   PUT /api/admin/departments/:id
// @access  Admin
router.put('/departments/:id', [
  idValidationRules(),
  checkValidation
], updateDepartment);

// @desc    Delete department
// @route   DELETE /api/admin/departments/:id
// @access  Admin
router.delete('/departments/:id', [
  idValidationRules(),
  checkValidation
], deleteDepartment);

// ============= SUBJECT MANAGEMENT =============

// @desc    Get all subjects
// @route   GET /api/admin/subjects
// @access  Admin
router.get('/subjects', [
  paginationValidationRules(),
  checkValidation
], getSubjects);

// @desc    Create new subject
// @route   POST /api/admin/subjects
// @access  Admin
router.post('/subjects', [
  subjectValidationRules(),
  checkValidation
], createSubject);

// @desc    Copy subjects from previous year
// @route   POST /api/admin/subjects/copy
// @access  Admin
router.post('/subjects/copy', [
  body('sourceDepartment')
    .isMongoId()
    .withMessage('Invalid source department ID'),
  body('sourceSemester')
    .isInt({ min: 1, max: 8 })
    .withMessage('Source semester must be between 1 and 8'),
  body('sourceAcademicYear')
    .notEmpty()
    .withMessage('Source academic year is required'),
  body('targetAcademicYear')
    .notEmpty()
    .withMessage('Target academic year is required'),
  checkValidation
], copySubjects);

// @desc    Get subjects by department and semester
// @route   GET /api/admin/subjects/department/:departmentId/semester/:semester
// @access  Admin
router.get('/subjects/department/:departmentId/semester/:semester', [
  body('departmentId')
    .isMongoId()
    .withMessage('Invalid department ID'),
  body('semester')
    .isInt({ min: 1, max: 8 })
    .withMessage('Semester must be between 1 and 8'),
  checkValidation
], getSubjectsByDepartmentAndSemester);

// @desc    Assign faculty to subject
// @route   PUT /api/admin/subjects/:id/assign-faculty
// @access  Admin
router.put('/subjects/:id/assign-faculty', [
  idValidationRules(),
  checkValidation
], assignSubjectFaculty);

// @desc    Get single subject
// @route   GET /api/admin/subjects/:id
// @access  Admin
router.get('/subjects/:id', [
  idValidationRules(),
  checkValidation
], getSubject);

// @desc    Update subject
// @route   PUT /api/admin/subjects/:id
// @access  Admin
router.put('/subjects/:id', [
  idValidationRules(),
  checkValidation
], updateSubject);

// @desc    Delete subject
// @route   DELETE /api/admin/subjects/:id
// @access  Admin
router.delete('/subjects/:id', [
  idValidationRules(),
  checkValidation
], deleteSubject);

module.exports = router;