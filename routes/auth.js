const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  logout,
  refreshToken,
  getPermissions
} = require('../controllers/authController');

const { 
  authenticate, 
  adminOnly, 
  updateLastLogin 
} = require('../middleware/auth');

const {
  userValidationRules,
  studentValidationRules,
  facultyValidationRules,
  loginValidationRules,
  checkValidation
} = require('../utils/validators');

const router = express.Router();

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Admin only
router.post('/register', [
  authenticate,
  adminOnly,
  (req, res, next) => {
    // Choose validation rules based on role
    const { role } = req.body;
    
    if (role === 'student') {
      return studentValidationRules()(req, res, next);
    } else if (role === 'faculty') {
      return facultyValidationRules()(req, res, next);
    } else {
      return userValidationRules()(req, res, next);
    }
  },
  checkValidation
], register);

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', [
  loginValidationRules(),
  checkValidation
], login);

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
router.get('/me', [authenticate, updateLastLogin], getMe);

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', authenticate, updateProfile);

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
router.put('/change-password', [
  authenticate,
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
  checkValidation
], changePassword);

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', authenticate, logout);

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Private
router.post('/refresh', authenticate, refreshToken);

// @desc    Get user permissions
// @route   GET /api/auth/permissions
// @access  Private
router.get('/permissions', authenticate, getPermissions);

module.exports = router;