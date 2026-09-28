const jwt = require('jsonwebtoken');
const { User, AcademicYear } = require('../models');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Admin only
const register = asyncHandler(async (req, res) => {
  const { 
    email, 
    password, 
    firstName, 
    lastName, 
    role, 
    phone,
    dateOfBirth,
    gender,
    studentInfo,
    facultyInfo,
    address
  } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('User already exists with this email', 400);
  }

  // Generate user ID based on role
  const userId = await User.generateUserId(role);

  // Get current academic year
  const currentAcademicYear = await AcademicYear.getCurrentAcademicYear();
  
  // Prepare user data
  const userData = {
    userId,
    email,
    password,
    firstName,
    lastName,
    role,
    phone,
    dateOfBirth,
    gender,
    address,
    createdBy: req.user._id
  };

  // Add role-specific information
  if (role === 'student' && studentInfo) {
    userData.studentInfo = {
      ...studentInfo,
      academicYear: currentAcademicYear?.year || new Date().getFullYear().toString()
    };
  }

  if (role === 'faculty' && facultyInfo) {
    userData.facultyInfo = facultyInfo;
  }

  const user = await User.create(userData);

  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: user._id,
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive
      },
      token
    }
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user by email or userId
  const user = await User.findOne({
    $or: [
      { email: email.toLowerCase() },
      { userId: email }
    ]
  }).select('+password');

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  // Check if user is active
  if (!user.isActive) {
    throw new AppError('Account is deactivated. Please contact administrator.', 401);
  }

  // Check password
  const isPasswordMatch = await user.comparePassword(password);
  if (!isPasswordMatch) {
    throw new AppError('Invalid credentials', 401);
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = generateToken(user._id);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        profileImage: user.profileImage,
        lastLogin: user.lastLogin,
        studentInfo: user.studentInfo,
        facultyInfo: user.facultyInfo
      },
      token
    }
  });
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('studentInfo.department', 'name code')
    .populate('facultyInfo.department', 'name code')
    .populate('facultyInfo.subjectsTeaching', 'name code');

  res.status(200).json({
    success: true,
    data: {
      user
    }
  });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = [
    'firstName',
    'lastName', 
    'phone',
    'address',
    'dateOfBirth',
    'gender',
    'profileImage'
  ];

  // Students can update their parent contact info
  if (req.user.role === 'student') {
    allowedFields.push('studentInfo.parentContact');
  }

  // Build update object with only allowed fields
  const updates = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { ...updates, updatedBy: req.user._id },
    { new: true, runValidators: true }
  ).populate('studentInfo.department', 'name code')
   .populate('facultyInfo.department', 'name code');

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user
    }
  });
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError('Current password and new password are required', 400);
  }

  if (newPassword.length < 6) {
    throw new AppError('New password must be at least 6 characters long', 400);
  }

  const user = await User.findById(req.user._id).select('+password');

  // Check current password
  const isCurrentPasswordCorrect = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordCorrect) {
    throw new AppError('Current password is incorrect', 400);
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password changed successfully'
  });
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  // In a stateless JWT system, logout is handled on the client side
  // by removing the token. This endpoint is for logging purposes.
  
  res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
});

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Private
const refreshToken = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  if (!user || !user.isActive) {
    throw new AppError('User not found or inactive', 401);
  }

  const token = generateToken(user._id);

  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: {
      token,
      user: {
        id: user._id,
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    }
  });
});

// @desc    Get user permissions
// @route   GET /api/auth/permissions
// @access  Private
const getPermissions = asyncHandler(async (req, res) => {
  const { role } = req.user;

  const permissions = {
    student: [
      'view_own_profile',
      'update_own_profile',
      'view_own_attendance',
      'view_own_grades',
      'apply_leave',
      'view_own_leaves'
    ],
    faculty: [
      'view_own_profile',
      'update_own_profile',
      'view_students',
      'mark_attendance',
      'view_attendance',
      'approve_leaves',
      'add_grades',
      'view_grades',
      'view_subjects'
    ],
    admin: [
      'all_permissions',
      'manage_users',
      'manage_departments',
      'manage_subjects',
      'manage_academic_years',
      'view_reports',
      'system_settings'
    ]
  };

  res.status(200).json({
    success: true,
    data: {
      role,
      permissions: permissions[role] || []
    }
  });
});

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  logout,
  refreshToken,
  getPermissions
};