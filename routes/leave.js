const express = require('express');
const {
  applyLeave,
  getLeaveApplications,
  getLeaveApplication,
  updateLeaveApplication,
  cancelLeaveApplication,
  reviewLeaveApplication,
  getPendingApprovals,
  getLeaveStatistics
} = require('../controllers/leaveController');

const {
  getLeaveBalance,
  getLeaveReport,
  checkEligibility,
  getCalendar,
  getDepartmentLeaveSummary,
  getLeaveAnalytics
} = require('../controllers/leaveReportsController');

const { 
  authenticate, 
  authorize, 
  adminOnly, 
  facultyOrAdmin,
  studentAccess
} = require('../middleware/auth');

const {
  leaveValidationRules,
  idValidationRules,
  paginationValidationRules,
  dateRangeValidationRules,
  checkValidation
} = require('../utils/validators');
const { body } = require('express-validator');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// @desc    Apply for leave
// @route   POST /api/leave/apply
// @access  Student
router.post('/apply', [
  authorize('student'),
  leaveValidationRules(),
  checkValidation
], applyLeave);

// @desc    Get leave statistics
// @route   GET /api/leave/statistics
// @access  Faculty, Admin
router.get('/statistics', [
  facultyOrAdmin,
  dateRangeValidationRules(),
  checkValidation
], getLeaveStatistics);

// @desc    Get leave analytics (admin only)
// @route   GET /api/leave/analytics
// @access  Admin
router.get('/analytics', [
  adminOnly,
  checkValidation
], getLeaveAnalytics);

// @desc    Get leave calendar
// @route   GET /api/leave/calendar
// @access  Faculty, Admin
router.get('/calendar', [
  facultyOrAdmin,
  checkValidation
], getCalendar);

// @desc    Get department leave summary
// @route   GET /api/leave/department-summary/:departmentId?
// @access  Faculty, Admin
router.get('/department-summary/:departmentId?', [
  facultyOrAdmin,
  checkValidation
], getDepartmentLeaveSummary);

// @desc    Get leave balance
// @route   GET /api/leave/balance/:studentId?
// @access  Student (own), Faculty, Admin
router.get('/balance/:studentId?', [
  checkValidation
], getLeaveBalance);

// @desc    Get leave report
// @route   GET /api/leave/report/:studentId?
// @access  Student (own), Faculty, Admin
router.get('/report/:studentId?', [
  checkValidation
], getLeaveReport);

// @desc    Check leave eligibility
// @route   POST /api/leave/check-eligibility
// @access  Student
router.post('/check-eligibility', [
  authorize('student'),
  body('leaveType')
    .isIn(['sick', 'personal', 'emergency', 'family', 'medical', 'academic', 'other'])
    .withMessage('Invalid leave type'),
  body('fromDate')
    .isISO8601()
    .withMessage('Please provide a valid from date'),
  body('toDate')
    .isISO8601()
    .withMessage('Please provide a valid to date'),
  checkValidation
], checkEligibility);

// @desc    Get pending approvals for faculty
// @route   GET /api/leave/pending-approvals
// @access  Faculty
router.get('/pending-approvals', [
  authorize('faculty')
], getPendingApprovals);

// @desc    Get all leave applications
// @route   GET /api/leave
// @access  Student (own), Faculty, Admin
router.get('/', [
  paginationValidationRules(),
  dateRangeValidationRules(),
  checkValidation
], getLeaveApplications);

// @desc    Review leave application (approve/reject)
// @route   PUT /api/leave/:id/review
// @access  Faculty, Admin
router.put('/:id/review', [
  facultyOrAdmin,
  idValidationRules(),
  body('action')
    .isIn(['approve', 'reject'])
    .withMessage('Action must be either approve or reject'),
  body('comments')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Comments cannot exceed 500 characters'),
  checkValidation
], reviewLeaveApplication);

// @desc    Get single leave application
// @route   GET /api/leave/:id
// @access  Student (own), Faculty, Admin
router.get('/:id', [
  idValidationRules(),
  checkValidation
], getLeaveApplication);

// @desc    Update leave application
// @route   PUT /api/leave/:id
// @access  Student (own pending applications)
router.put('/:id', [
  authorize('student'),
  idValidationRules(),
  checkValidation
], updateLeaveApplication);

// @desc    Cancel leave application
// @route   DELETE /api/leave/:id
// @access  Student (own applications)
router.delete('/:id', [
  authorize('student'),
  idValidationRules(),
  checkValidation
], cancelLeaveApplication);

module.exports = router;