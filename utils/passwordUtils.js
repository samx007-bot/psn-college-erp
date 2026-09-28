const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Hash password
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Compare password with hash
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Generate random password
const generateRandomPassword = (length = 8) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  // Ensure at least one character from each type
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// Validate password strength
const validatePasswordStrength = (password) => {
  const minLength = 6;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const score = {
    length: password.length >= minLength,
    uppercase: hasUpperCase,
    lowercase: hasLowerCase,
    numbers: hasNumbers,
    special: hasSpecialChar,
    total: 0
  };
  
  score.total = Object.values(score).filter(Boolean).length - 1; // -1 because total itself is counted
  
  let strength = 'weak';
  let message = 'Password should contain ';
  const missing = [];
  
  if (!score.length) missing.push(`at least ${minLength} characters`);
  if (!score.uppercase) missing.push('uppercase letters');
  if (!score.lowercase) missing.push('lowercase letters');
  if (!score.numbers) missing.push('numbers');
  if (!score.special) missing.push('special characters');
  
  if (missing.length === 0) {
    strength = score.total >= 4 ? 'strong' : 'medium';
    message = 'Password strength is good';
  } else {
    message += missing.join(', ');
  }
  
  return {
    isValid: missing.length === 0 && password.length >= minLength,
    strength,
    score: score.total,
    message,
    requirements: score
  };
};

// Generate password reset token
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Hash reset token
const hashResetToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Generate secure random string
const generateSecureRandom = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Create default password based on user info
const createDefaultPassword = (firstName, lastName, userId) => {
  // Create a default password: FirstLast@123 (first 4 chars of first name + last 4 chars of last name + @123)
  const firstPart = firstName.substring(0, 4).toLowerCase();
  const lastPart = lastName.substring(0, 4).toLowerCase();
  const defaultPassword = `${firstPart}${lastPart}@123`;
  
  return defaultPassword;
};

module.exports = {
  hashPassword,
  comparePassword,
  generateRandomPassword,
  validatePasswordStrength,
  generateResetToken,
  hashResetToken,
  generateSecureRandom,
  createDefaultPassword
};