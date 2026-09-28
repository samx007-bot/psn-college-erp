# PSN Engineering College ERP System

A comprehensive ERP (Enterprise Resource Planning) system built specifically for PSN Engineering College to manage students, faculty, attendance, leave applications, grades, and administrative tasks.

## 🚀 Features

### Core Modules
- **User Management**: Students, Faculty, and Admin profiles with role-based access
- **Attendance System**: Digital attendance marking with percentage calculations
- **Leave Management**: Multi-level approval workflow for leave applications
- **Grade Management**: Assessment tracking with CGPA calculations
- **Department Management**: Organize users and subjects by departments
- **Subject Management**: Course management with faculty assignments
- **Analytics & Reporting**: Comprehensive dashboards and reports

### Role-Based Features

#### Students
- View academic dashboard with attendance and grade summaries
- Apply for leaves with reason and supporting documents
- Check attendance percentage and eligibility
- View grades and generate report cards
- Access class schedules and subject information

#### Faculty
- Mark attendance for assigned classes
- Add and publish grades for assessments
- Approve/reject student leave applications
- View student performance analytics
- Manage assigned subjects and classes

#### Administrators
- Complete system oversight and management
- User creation and management (bulk operations supported)
- Department and subject management
- System-wide analytics and reporting
- Data export and backup capabilities

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database with Mongoose ODM
- **JWT** - Authentication and authorization
- **bcrypt** - Password hashing
- **Express Validator** - Input validation

### Security Features
- JWT-based authentication
- Role-based access control
- Input validation and sanitization
- Rate limiting for API endpoints
- Password strength enforcement
- Account lockout protection

## 📋 Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or cloud instance)
- npm or yarn package manager

## 🔧 Installation & Setup

### 1. Clone the repository
```bash
git clone <repository-url>
cd psn-college-erp
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/psn_college_erp
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
ADMIN_EMAIL=admin@psn.edu.in
ADMIN_PASSWORD=admin123
COLLEGE_NAME=PSN Engineering College
COLLEGE_CODE=PSN
```

### 4. Database Setup
Ensure MongoDB is running, then start the application:
```bash
npm start
```

The application will automatically:
- Connect to MongoDB
- Create necessary indexes
- Set up the default admin account

### 5. Access the Application
- **Server**: http://localhost:5000
- **API Health Check**: http://localhost:5000/api/health
- **Default Admin**: admin@psn.edu.in / admin123

## 📖 API Documentation

### Authentication Endpoints
```
POST /api/auth/login - User login
POST /api/auth/register - User registration (Admin only)
GET /api/auth/me - Get current user profile
PUT /api/auth/profile - Update user profile
PUT /api/auth/change-password - Change password
```

### Student Management
```
GET /api/students - Get all students (with pagination)
POST /api/students - Create new student (Admin only)
GET /api/students/:id - Get student details
PUT /api/students/:id - Update student profile
GET /api/students/:id/dashboard - Student dashboard data
GET /api/students/:id/attendance - Student attendance summary
GET /api/students/:id/grades - Student grades
GET /api/students/:id/leaves - Student leave applications
```

### Faculty Management
```
GET /api/faculty - Get all faculty members
POST /api/faculty - Create new faculty (Admin only)
GET /api/faculty/:id/dashboard - Faculty dashboard
GET /api/faculty/:id/subjects - Faculty assigned subjects
GET /api/faculty/:id/students - Students in faculty classes
```

### Attendance Management
```
POST /api/faculty/attendance/mark - Mark attendance
GET /api/faculty/attendance/:subjectId - Get class attendance
GET /api/faculty/attendance/:subjectId/summary - Attendance summary
PUT /api/faculty/attendance/:id - Update attendance record
```

### Leave Management
```
POST /api/leave/apply - Apply for leave
GET /api/leave - Get leave applications
GET /api/leave/:id - Get specific leave application
PUT /api/leave/:id/review - Approve/reject leave
GET /api/leave/pending-approvals - Faculty pending approvals
GET /api/leave/statistics - Leave statistics
GET /api/leave/balance/:studentId - Leave balance
```

### Grade Management
```
POST /api/faculty/grades - Add student grades
GET /api/faculty/grades/:subjectId - Get subject grades
PUT /api/faculty/grades/:subjectId/publish - Publish grades
PUT /api/faculty/grades/:gradeId - Update grade
GET /api/faculty/grades/:subjectId/statistics - Grade statistics
```

### Admin Management
```
GET /api/admin/dashboard - Admin dashboard
GET /api/admin/users - All users with filtering
POST /api/admin/users/bulk - Bulk user creation
GET /api/admin/statistics - System statistics
GET /api/admin/departments - Department management
GET /api/admin/subjects - Subject management
GET /api/admin/export - Data export
```

## 🔒 Authentication & Authorization

The system uses JWT-based authentication with role-based access control:

### Roles & Permissions

#### Student
- Access own academic data
- Apply for leaves
- View attendance and grades
- Update profile information

#### Faculty
- Mark attendance for assigned classes
- Add and manage grades
- Approve leave applications
- View student data for assigned classes

#### Admin
- Full system access
- User management (create, update, delete)
- Department and subject management
- System analytics and reports
- Data export capabilities

### Security Headers
- CORS protection
- Rate limiting
- Input sanitization
- Password hashing with bcrypt
- JWT token expiration

## 📊 Database Schema

### Key Collections
- **Users**: Student, faculty, and admin profiles
- **Departments**: Academic departments
- **Subjects**: Courses with faculty assignments
- **Attendance**: Daily attendance records
- **Grades**: Assessment scores and grades
- **Leaves**: Leave applications and approvals
- **Academic Years**: Academic calendar management

### Relationships
- Students belong to departments
- Subjects are assigned to departments and faculty
- Attendance links students, subjects, and faculty
- Leave applications have approval workflows

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Test specific modules
node test-auth.js
node test-student-api.js
node test-faculty-api.js
node test-admin-api.js
node test-leave-system.js
```

### Test Accounts
After setup, use these default credentials:
- **Admin**: admin@psn.edu.in / admin123

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=<your-production-mongodb-uri>
JWT_SECRET=<strong-secret-key>
ADMIN_EMAIL=<admin-email>
ADMIN_PASSWORD=<secure-password>
```

### Deployment Platforms
- **Heroku**: Use provided Procfile
- **Railway**: Auto-deployment ready
- **Render**: Compatible with build settings
- **DigitalOcean App Platform**: Docker ready
- **AWS/GCP**: Use PM2 for process management

## 📁 Project Structure

```
psn-college-erp/
├── config/
│   └── database.js          # Database configuration
├── controllers/             # Route controllers
│   ├── authController.js
│   ├── studentController.js
│   ├── facultyController.js
│   ├── adminController.js
│   └── leaveController.js
├── middleware/             # Custom middleware
│   ├── auth.js            # Authentication middleware
│   ├── errorHandler.js    # Error handling
│   └── security.js        # Security middleware
├── models/                # Database models
│   ├── User.js
│   ├── Department.js
│   ├── Subject.js
│   ├── Attendance.js
│   ├── Grade.js
│   └── Leave.js
├── routes/                # API routes
├── utils/                 # Utility functions
├── uploads/              # File uploads directory
├── server.js             # Application entry point
└── package.json
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and queries, contact:
- **Email**: support@psn.edu.in
- **Phone**: +91-XXXXXXXXXX

## 🔄 Changelog

### Version 1.0.0 (Current)
- Complete ERP system with all core modules
- Role-based authentication and authorization
- Comprehensive attendance and leave management
- Grade management with CGPA calculation
- Admin dashboard with analytics
- API documentation and testing suite

---

**Built with ❤️ for PSN Engineering College**