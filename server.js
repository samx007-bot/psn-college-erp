const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import database configuration
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const studentRoutes = require('./routes/students');
const facultyRoutes = require('./routes/faculty');
const facultyAttendanceRoutes = require('./routes/facultyAttendance');
const facultyGradingRoutes = require('./routes/facultyGrading');
const adminRoutes = require('./routes/admin');
const attendanceRoutes = require('./routes/attendance');
const leaveRoutes = require('./routes/leave');
const gradeRoutes = require('./routes/grades');
const subjectRoutes = require('./routes/subjects');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { 
  apiRateLimit, 
  securityHeaders, 
  sanitizeInput, 
  corsOptions 
} = require('./middleware/security');

const app = express();

// Connect to database
connectDB().then(() => {
  // Create default admin user after database connection
  const createDefaultAdmin = require('./utils/createDefaultAdmin');
  createDefaultAdmin();
});

// Security middleware
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(apiRateLimit);
app.use(sanitizeInput);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/faculty/attendance', facultyAttendanceRoutes);
app.use('/api/faculty/grades', facultyGradingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/subjects', subjectRoutes);

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    message: 'PSN College ERP Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`PSN College ERP Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;