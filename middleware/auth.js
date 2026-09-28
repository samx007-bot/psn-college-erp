const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Middleware to verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Invalid token.'
    });
  }
};

// Middleware to check user roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }

    next();
  };
};

// Middleware for admin only access
const adminOnly = authorize('admin');

// Middleware for faculty and admin access
const facultyOrAdmin = authorize('faculty', 'admin');

// Middleware for student access (students can only access their own data)
const studentAccess = async (req, res, next) => {
  try {
    if (req.user.role === 'admin' || req.user.role === 'faculty') {
      return next();
    }

    if (req.user.role === 'student') {
      // Students can only access their own data
      const studentId = req.params.studentId || req.body.student || req.query.student;
      
      if (studentId && studentId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Students can only access their own data.'
        });
      }
      
      // Automatically set student ID for requests
      if (req.body && !req.body.student) {
        req.body.student = req.user._id;
      }
      if (req.query && !req.query.student) {
        req.query.student = req.user._id;
      }
      if (req.params && !req.params.studentId) {
        req.params.studentId = req.user._id;
      }
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed.'
    });
  }
};

// Middleware to check if user owns the resource
const resourceOwner = (resourceField = 'user') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const Model = req.Model; // Model should be set in route
      
      if (!Model) {
        return next();
      }

      const resource = await Model.findById(resourceId);
      
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found.'
        });
      }

      // Admin can access all resources
      if (req.user.role === 'admin') {
        return next();
      }

      // Check ownership
      const ownerId = resource[resourceField];
      if (ownerId && ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own resources.'
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Resource ownership check failed.'
      });
    }
  };
};

// Middleware to update user's last login
const updateLastLogin = async (req, res, next) => {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, {
        lastLogin: new Date()
      });
    }
    next();
  } catch (error) {
    // Don't fail the request if this fails
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  adminOnly,
  facultyOrAdmin,
  studentAccess,
  resourceOwner,
  updateLastLogin
};