const { Leave, User, AcademicYear } = require('../models');

// Calculate leave balance for a student
const calculateLeaveBalance = async (studentId, academicYear) => {
  try {
    const currentYear = academicYear || (await AcademicYear.getCurrentAcademicYear())?.year;
    
    // Get all approved leaves for the academic year
    const approvedLeaves = await Leave.find({
      student: studentId,
      academicYear: currentYear,
      status: 'approved'
    });

    // Calculate used leaves by type
    const leaveTypeStats = approvedLeaves.reduce((acc, leave) => {
      if (!acc[leave.leaveType]) {
        acc[leave.leaveType] = { count: 0, days: 0 };
      }
      acc[leave.leaveType].count += 1;
      acc[leave.leaveType].days += leave.totalDays;
      return acc;
    }, {});

    // Standard leave allowances
    const allowances = {
      casual: 12,
      sick: 15,
      medical: 20,
      emergency: 5,
      personal: 8,
      family: 10,
      academic: 5,
      other: 3
    };

    // Calculate remaining balance
    const balance = {};
    Object.keys(allowances).forEach(type => {
      const used = leaveTypeStats[type]?.days || 0;
      balance[type] = {
        allowed: allowances[type],
        used,
        remaining: Math.max(0, allowances[type] - used),
        applications: leaveTypeStats[type]?.count || 0
      };
    });

    const totalUsed = Object.values(leaveTypeStats).reduce((sum, stat) => sum + stat.days, 0);
    const totalAllowed = Object.values(allowances).reduce((sum, days) => sum + days, 0);

    return {
      academicYear: currentYear,
      totalAllowed,
      totalUsed,
      totalRemaining: Math.max(0, totalAllowed - totalUsed),
      byType: balance,
      utilizationPercentage: Math.round((totalUsed / totalAllowed) * 100)
    };
  } catch (error) {
    throw new Error(`Error calculating leave balance: ${error.message}`);
  }
};

// Generate leave report for a student
const generateLeaveReport = async (studentId, academicYear, includeDetails = true) => {
  try {
    const student = await User.findById(studentId)
      .populate('studentInfo.department', 'name code');

    if (!student || student.role !== 'student') {
      throw new Error('Student not found');
    }

    const currentYear = academicYear || (await AcademicYear.getCurrentAcademicYear())?.year;
    
    // Get all leave applications for the year
    const leaves = await Leave.find({
      student: studentId,
      academicYear: currentYear
    })
    .populate('reviewedBy', 'firstName lastName')
    .populate('approvalWorkflow.approver', 'firstName lastName role')
    .sort({ applicationDate: -1 });

    // Calculate statistics
    const statistics = {
      total: leaves.length,
      approved: leaves.filter(l => l.status === 'approved').length,
      rejected: leaves.filter(l => l.status === 'rejected').length,
      pending: leaves.filter(l => l.status === 'pending').length,
      cancelled: leaves.filter(l => l.status === 'cancelled').length,
      totalDaysApplied: leaves.reduce((sum, l) => sum + l.totalDays, 0),
      totalDaysApproved: leaves
        .filter(l => l.status === 'approved')
        .reduce((sum, l) => sum + l.totalDays, 0)
    };

    // Group by leave type
    const byType = leaves.reduce((acc, leave) => {
      if (!acc[leave.leaveType]) {
        acc[leave.leaveType] = [];
      }
      acc[leave.leaveType].push(leave);
      return acc;
    }, {});

    // Get leave balance
    const balance = await calculateLeaveBalance(studentId, currentYear);

    return {
      student: {
        id: student._id,
        name: student.fullName,
        rollNumber: student.studentInfo.rollNumber,
        department: student.studentInfo.department.name
      },
      academicYear: currentYear,
      statistics,
      balance,
      byType,
      ...(includeDetails && { 
        applications: leaves.map(leave => ({
          id: leave._id,
          type: leave.leaveType,
          fromDate: leave.fromDate,
          toDate: leave.toDate,
          totalDays: leave.totalDays,
          reason: leave.reason,
          status: leave.status,
          applicationDate: leave.applicationDate,
          reviewedBy: leave.reviewedBy,
          reviewedAt: leave.reviewedAt,
          isUrgent: leave.isUrgent
        }))
      }),
      generatedAt: new Date()
    };
  } catch (error) {
    throw new Error(`Error generating leave report: ${error.message}`);
  }
};

// Check leave eligibility
const checkLeaveEligibility = async (studentId, leaveType, fromDate, toDate) => {
  try {
    const student = await User.findById(studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const today = new Date();

    const eligibility = {
      eligible: true,
      warnings: [],
      errors: [],
      recommendations: []
    };

    // Check if dates are valid
    if (startDate >= endDate) {
      eligibility.errors.push('End date must be after start date');
      eligibility.eligible = false;
    }

    if (startDate < today && leaveType !== 'emergency') {
      eligibility.errors.push('Cannot apply for past dates unless it is an emergency leave');
      eligibility.eligible = false;
    }

    // Check for overlapping applications
    const overlapping = await Leave.findOne({
      student: studentId,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { fromDate: { $lte: endDate }, toDate: { $gte: startDate } }
      ]
    });

    if (overlapping) {
      eligibility.errors.push('You have an overlapping leave application for these dates');
      eligibility.eligible = false;
    }

    // Check leave balance
    const balance = await calculateLeaveBalance(studentId);
    const typeBalance = balance.byType[leaveType];

    if (typeBalance && totalDays > typeBalance.remaining) {
      if (leaveType === 'medical') {
        eligibility.warnings.push(`Insufficient ${leaveType} leave balance. This may require medical certificate.`);
      } else {
        eligibility.errors.push(`Insufficient ${leaveType} leave balance. Available: ${typeBalance.remaining} days`);
        eligibility.eligible = false;
      }
    }

    // Check duration-based warnings
    if (totalDays > 7) {
      eligibility.warnings.push('Leave duration exceeds 7 days. Additional approvals may be required.');
    }

    if (totalDays > 15) {
      eligibility.warnings.push('Extended leave may affect academic performance and attendance.');
    }

    // Check attendance impact
    const currentAcademicYear = await AcademicYear.getCurrentAcademicYear();
    if (currentAcademicYear) {
      const currentSemester = await AcademicYear.getCurrentSemester();
      if (currentSemester && startDate <= currentSemester.endDate) {
        eligibility.warnings.push('Leave falls within current semester. May affect attendance percentage.');
      }
    }

    // Recommendations
    if (leaveType === 'sick' && totalDays > 3) {
      eligibility.recommendations.push('Consider applying for medical leave if you have medical certificate');
    }

    if (totalDays === 1) {
      eligibility.recommendations.push('For single day leave, consider informal permission from faculty');
    }

    return {
      eligibility,
      leaveDetails: {
        type: leaveType,
        fromDate: startDate,
        toDate: endDate,
        totalDays,
        balance: typeBalance
      }
    };
  } catch (error) {
    throw new Error(`Error checking leave eligibility: ${error.message}`);
  }
};

// Get leave calendar for a student or department
const getLeaveCalendar = async (options = {}) => {
  try {
    const { 
      studentId, 
      departmentId, 
      month, 
      year = new Date().getFullYear(),
      status = ['approved'] 
    } = options;

    // Build filter
    const filter = { status: { $in: status } };

    if (studentId) {
      filter.student = studentId;
    } else if (departmentId) {
      const students = await User.find({
        role: 'student',
        'studentInfo.department': departmentId,
        isActive: true
      }).select('_id');
      
      filter.student = { $in: students.map(s => s._id) };
    }

    // Date filter for specific month/year
    if (month) {
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0);
      
      filter.$or = [
        {
          fromDate: { $lte: endOfMonth },
          toDate: { $gte: startOfMonth }
        }
      ];
    } else {
      // Full year
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31);
      
      filter.$or = [
        {
          fromDate: { $lte: endOfYear },
          toDate: { $gte: startOfYear }
        }
      ];
    }

    const leaves = await Leave.find(filter)
      .populate('student', 'firstName lastName studentInfo.rollNumber')
      .sort({ fromDate: 1 });

    // Group leaves by date
    const calendar = {};
    
    leaves.forEach(leave => {
      const current = new Date(leave.fromDate);
      const end = new Date(leave.toDate);
      
      while (current <= end) {
        const dateKey = current.toISOString().split('T')[0];
        
        if (!calendar[dateKey]) {
          calendar[dateKey] = [];
        }
        
        calendar[dateKey].push({
          id: leave._id,
          student: leave.student,
          type: leave.leaveType,
          reason: leave.reason,
          isFirstDay: current.getTime() === leave.fromDate.getTime(),
          isLastDay: current.getTime() === leave.toDate.getTime(),
          totalDays: leave.totalDays
        });
        
        current.setDate(current.getDate() + 1);
      }
    });

    return {
      year,
      month: month || null,
      calendar,
      summary: {
        totalLeaves: leaves.length,
        totalDays: leaves.reduce((sum, l) => sum + l.totalDays, 0),
        byType: leaves.reduce((acc, leave) => {
          acc[leave.leaveType] = (acc[leave.leaveType] || 0) + 1;
          return acc;
        }, {})
      }
    };
  } catch (error) {
    throw new Error(`Error generating leave calendar: ${error.message}`);
  }
};

// Send leave notifications (placeholder for email/SMS integration)
const sendLeaveNotification = async (leaveId, type, recipientId) => {
  try {
    const leave = await Leave.findById(leaveId)
      .populate('student', 'firstName lastName email studentInfo.rollNumber')
      .populate('reviewedBy', 'firstName lastName email');

    const recipient = await User.findById(recipientId);
    
    if (!recipient) {
      throw new Error('Recipient not found');
    }

    // This would integrate with email/SMS service
    const notification = {
      type,
      recipient: recipient.email,
      subject: getNotificationSubject(type, leave),
      message: getNotificationMessage(type, leave),
      timestamp: new Date()
    };

    // Log notification (in production, send actual email/SMS)
    console.log('Leave Notification:', notification);

    // Update leave notifications array
    await Leave.findByIdAndUpdate(leaveId, {
      $push: {
        notifications: {
          recipient: recipientId,
          type,
          sent: true,
          sentAt: new Date()
        }
      }
    });

    return notification;
  } catch (error) {
    throw new Error(`Error sending leave notification: ${error.message}`);
  }
};

// Helper functions for notifications
function getNotificationSubject(type, leave) {
  const studentName = leave.student.fullName;
  const rollNumber = leave.student.studentInfo.rollNumber;
  
  switch (type) {
    case 'application':
      return `Leave Application Submitted - ${studentName} (${rollNumber})`;
    case 'approval':
      return `Leave Application Approved - ${studentName} (${rollNumber})`;
    case 'rejection':
      return `Leave Application Rejected - ${studentName} (${rollNumber})`;
    case 'reminder':
      return `Leave Application Pending Approval - ${studentName} (${rollNumber})`;
    default:
      return `Leave Application Update - ${studentName} (${rollNumber})`;
  }
}

function getNotificationMessage(type, leave) {
  const studentName = leave.student.fullName;
  const rollNumber = leave.student.studentInfo.rollNumber;
  const dates = `${leave.fromDate.toDateString()} to ${leave.toDate.toDateString()}`;
  
  switch (type) {
    case 'application':
      return `${studentName} (${rollNumber}) has applied for ${leave.leaveType} leave from ${dates}. Reason: ${leave.reason}`;
    case 'approval':
      return `Leave application for ${studentName} (${rollNumber}) from ${dates} has been approved.`;
    case 'rejection':
      return `Leave application for ${studentName} (${rollNumber}) from ${dates} has been rejected. Comments: ${leave.reviewComments || 'No comments'}`;
    case 'reminder':
      return `Leave application for ${studentName} (${rollNumber}) from ${dates} is pending your approval.`;
    default:
      return `Leave application for ${studentName} (${rollNumber}) has been updated.`;
  }
}

module.exports = {
  calculateLeaveBalance,
  generateLeaveReport,
  checkLeaveEligibility,
  getLeaveCalendar,
  sendLeaveNotification
};