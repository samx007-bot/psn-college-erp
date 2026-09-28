// const rateLimit = require('express-rate-limit');
const { AppError } = require('./errorHandler');

// Simple rate limiting implementation (in-memory)
const createSimpleRateLimit = (windowMs, max, message) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!requests.has(ip)) {
      requests.set(ip, []);
    }
    
    const userRequests = requests.get(ip);
    // Remove old requests outside window
    const validRequests = userRequests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= max) {
      return res.status(429).json(message);
    }
    
    validRequests.push(now);
    requests.set(ip, validRequests);
    next();
  };
};

// Rate limiting for authentication routes
const authRateLimit = createSimpleRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // max 5 requests
  {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes.'
  }
);

// General API rate limiting
const apiRateLimit = createSimpleRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // max 100 requests
  {
    success: false,
    message: 'Too many requests, please try again later.'
  }
);

// Strict rate limiting for sensitive operations
const strictRateLimit = createSimpleRateLimit(
  60 * 60 * 1000, // 1 hour
  3, // max 3 requests
  {
    success: false,
    message: 'Too many attempts for this operation, please try again after 1 hour.'
  }
);

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CSP for API (adjust as needed for frontend)
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  
  next();
};

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Remove any potential XSS characters from string inputs
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '');
    }
    
    if (typeof obj === 'object' && obj !== null) {
      for (let key in obj) {
        obj[key] = sanitize(obj[key]);
      }
    }
    
    return obj;
  };
  
  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);
  
  next();
};

// IP whitelist middleware (for admin operations)
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied from this IP address.'
      });
    }
    
    next();
  };
};

// Time-based access control
const timeBasedAccess = (allowedHours = { start: 6, end: 22 }) => {
  return (req, res, next) => {
    const currentHour = new Date().getHours();
    
    if (currentHour < allowedHours.start || currentHour > allowedHours.end) {
      // Allow admin access always
      if (req.user && req.user.role === 'admin') {
        return next();
      }
      
      return res.status(403).json({
        success: false,
        message: `System access is only allowed between ${allowedHours.start}:00 and ${allowedHours.end}:00.`
      });
    }
    
    next();
  };
};

// Account lockout middleware
const accountLockout = {
  // Store failed attempts in memory (in production, use Redis)
  failedAttempts: new Map(),
  
  // Record failed attempt
  recordFailedAttempt: (identifier) => {
    const attempts = accountLockout.failedAttempts.get(identifier) || { count: 0, lockUntil: null };
    attempts.count += 1;
    attempts.lastAttempt = new Date();
    
    // Lock account after 5 failed attempts for 30 minutes
    if (attempts.count >= 5) {
      attempts.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
    }
    
    accountLockout.failedAttempts.set(identifier, attempts);
  },
  
  // Check if account is locked
  isLocked: (identifier) => {
    const attempts = accountLockout.failedAttempts.get(identifier);
    if (!attempts) return false;
    
    if (attempts.lockUntil && attempts.lockUntil > new Date()) {
      return true;
    }
    
    // Reset if lock period has passed
    if (attempts.lockUntil && attempts.lockUntil <= new Date()) {
      accountLockout.failedAttempts.delete(identifier);
    }
    
    return false;
  },
  
  // Clear failed attempts (on successful login)
  clearFailedAttempts: (identifier) => {
    accountLockout.failedAttempts.delete(identifier);
  },
  
  // Middleware to check lockout
  checkLockout: (req, res, next) => {
    const identifier = req.body.email || req.body.userId;
    
    if (identifier && accountLockout.isLocked(identifier)) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed login attempts. Please try again later.'
      });
    }
    
    next();
  }
};

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',') 
      : ['http://localhost:3000', 'http://localhost:3001'];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

module.exports = {
  authRateLimit,
  apiRateLimit,
  strictRateLimit,
  securityHeaders,
  sanitizeInput,
  ipWhitelist,
  timeBasedAccess,
  accountLockout,
  corsOptions
};