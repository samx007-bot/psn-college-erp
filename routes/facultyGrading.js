const express = require('express');
const {
  addGrades,
  getSubjectGrades,
  publishGrades,
  updateGrade,
  getGradeStatistics
} = require('../controllers/facultyGradingController');

const { 
  authenticate, 
  facultyOrAdmin
} = require('../middleware/auth');

const {
  idValidationRules,
  paginationValidationRules,
  checkValidation
} = require('../utils/validators');
const { body } = require('express-validator');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);
router.use(facultyOrAdmin);

// @desc    Add grades for students
// @route   POST /api/faculty/grades
// @access  Faculty
router.post('/', [
  body('subjectId')
    .isMongoId()
    .withMessage('Invalid subject ID'),
  body('assessmentType')
    .isIn(['internal', 'external', 'assignment', 'project', 'practical', 'quiz', 'mid_term', 'final'])
    .withMessage('Invalid assessment type'),
  body('assessmentName')
    .notEmpty()
    .trim()
    .withMessage('Assessment name is required'),
  body('maxMarks')
    .isFloat({ min: 1 })
    .withMessage('Maximum marks must be greater than 0'),
  body('assessmentDate')
    .isISO8601()
    .withMessage('Please provide a valid assessment date'),
  body('grades')
    .isArray({ min: 1 })
    .withMessage('Grades data must be a non-empty array'),
  body('grades.*.studentId')
    .isMongoId()
    .withMessage('Invalid student ID'),
  body('grades.*.obtainedMarks')
    .isFloat({ min: 0 })
    .withMessage('Obtained marks must be 0 or greater'),
  checkValidation
], addGrades);

// @desc    Get grade statistics for subject
// @route   GET /api/faculty/grades/:subjectId/statistics
// @access  Faculty
router.get('/:subjectId/statistics', [
  idValidationRules(),
  checkValidation
], getGradeStatistics);

// @desc    Publish grades
// @route   PUT /api/faculty/grades/:subjectId/publish
// @access  Faculty
router.put('/:subjectId/publish', [
  idValidationRules(),
  checkValidation
], publishGrades);

// @desc    Get grades for a subject
// @route   GET /api/faculty/grades/:subjectId
// @access  Faculty
router.get('/:subjectId', [
  idValidationRules(),
  paginationValidationRules(),
  checkValidation
], getSubjectGrades);

// @desc    Update single grade
// @route   PUT /api/faculty/grades/:gradeId
// @access  Faculty
router.put('/:gradeId', [
  idValidationRules(),
  body('obtainedMarks')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Obtained marks must be 0 or greater'),
  body('maxMarks')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Maximum marks must be greater than 0'),
  checkValidation
], updateGrade);

module.exports = router;