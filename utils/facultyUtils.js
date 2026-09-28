const { User, Subject, Attendance, Grade, Leave } = require('../models');

// Get faculty workload statistics
const getFacultyWorkload = async (facultyId, academicYear) => {
  try {
    // Get assigned subjects
    const subjects = await Subject.find({
      $or: [
        { 'faculty.theory': facultyId },
        { 'faculty.practical': facultyId }
      ],
      academicYear,
      isActive: true
    });

    // Calculate total teaching hours per week
    let totalHours = 0;
    const subjectDetails = subjects.map(subject => {
      let hoursPerWeek = 0;
      subject.schedule.forEach(slot => {
        // Assuming each slot is 1 hour (can be customized)
        hoursPerWeek += 1;
      });
      totalHours += hoursPerWeek;

      return {
        id: subject._id,
        name: subject.name,
        code: subject.code,
        semester: subject.semester,
        type: subject.type,
        hoursPerWeek,
        role: subject.faculty.theory?.toString() === facultyId ? 'theory' : 'practical'
      };
    });

    // Get student count across all subjects
    const departmentIds = [...new Set(subjects.map(s => s.department))];
    const totalStudents = await User.countDocuments({
      role: 'student',
      'studentInfo.department': { $in: departmentIds },
      isActive: true
    });

    // Get pending leave approvals
    const pendingLeaveApprovals = await Leave.countDocuments({
      'approvalWorkflow.approver': facultyId,
      'approvalWorkflow.status': 'pending',
      status: 'pending'
    });

    return {
      totalSubjects: subjects.length,
      totalTeachingHours: totalHours,
      totalStudents,
      pendingLeaveApprovals,
      subjectDetails,
      workloadLevel: totalHours > 20 ? 'high' : totalHours > 15 ? 'medium' : 'low'
    };
  } catch (error) {
    throw new Error(`Error calculating faculty workload: ${error.message}`);
  }
};

// Generate faculty performance report
const generateFacultyPerformanceReport = async (facultyId, academicYear, semester) => {
  try {
    const faculty = await User.findById(facultyId)
      .populate('facultyInfo.department', 'name code');

    if (!faculty || faculty.role !== 'faculty') {
      throw new Error('Faculty not found');
    }

    // Get assigned subjects
    const subjects = await Subject.find({
      $or: [
        { 'faculty.theory': facultyId },
        { 'faculty.practical': facultyId }
      ],
      academicYear,
      ...(semester && { semester }),
      isActive: true
    });

    const subjectPerformance = await Promise.all(
      subjects.map(async (subject) => {
        // Get attendance statistics
        const totalAttendanceMarked = await Attendance.countDocuments({
          subject: subject._id,
          faculty: facultyId
        });

        const avgAttendancePercentage = await Attendance.aggregate([
          {
            $match: {
              subject: subject._id,
              faculty: facultyId
            }
          },
          {
            $group: {
              _id: '$student',
              attendancePercentage: {
                $avg: {
                  $cond: [{ $in: ['$status', ['present', 'late']] }, 100, 0]
                }
              }
            }
          },
          {
            $group: {
              _id: null,
              overallAverage: { $avg: '$attendancePercentage' }
            }
          }
        ]);

        // Get grading statistics
        const gradesGiven = await Grade.countDocuments({
          subject: subject._id,
          faculty: facultyId,
          status: 'published'
        });

        const gradeDistribution = await Grade.aggregate([
          {
            $match: {
              subject: subject._id,
              faculty: facultyId,
              status: 'published'
            }
          },
          {
            $group: {
              _id: '$grade',
              count: { $sum: 1 }
            }
          }
        ]);

        const avgGradePercentage = await Grade.aggregate([
          {
            $match: {
              subject: subject._id,
              faculty: facultyId,
              status: 'published'
            }
          },
          {
            $group: {
              _id: null,
              avgPercentage: { $avg: '$percentage' }
            }
          }
        ]);

        return {
          subject: {
            id: subject._id,
            name: subject.name,
            code: subject.code,
            semester: subject.semester,
            type: subject.type
          },
          attendance: {
            totalClassesConducted: totalAttendanceMarked,
            averageAttendancePercentage: avgAttendancePercentage[0]?.overallAverage || 0
          },
          grading: {
            totalGradesGiven: gradesGiven,
            averageGradePercentage: avgGradePercentage[0]?.avgPercentage || 0,
            gradeDistribution: gradeDistribution.reduce((acc, curr) => {
              acc[curr._id] = curr.count;
              return acc;
            }, {})
          }
        };
      })
    );

    // Calculate overall metrics
    const totalClasses = subjectPerformance.reduce((sum, s) => sum + s.attendance.totalClassesConducted, 0);
    const totalGrades = subjectPerformance.reduce((sum, s) => sum + s.grading.totalGradesGiven, 0);
    const avgAttendance = subjectPerformance.length > 0 
      ? subjectPerformance.reduce((sum, s) => sum + s.attendance.averageAttendancePercentage, 0) / subjectPerformance.length
      : 0;
    const avgGrades = subjectPerformance.length > 0 
      ? subjectPerformance.reduce((sum, s) => sum + s.grading.averageGradePercentage, 0) / subjectPerformance.length
      : 0;

    return {
      faculty: {
        name: faculty.fullName,
        employeeId: faculty.facultyInfo.employeeId,
        department: faculty.facultyInfo.department.name,
        designation: faculty.facultyInfo.designation
      },
      period: {
        academicYear,
        semester
      },
      overall: {
        totalSubjects: subjects.length,
        totalClassesConducted: totalClasses,
        totalGradesGiven: totalGrades,
        averageAttendancePercentage: Math.round(avgAttendance * 100) / 100,
        averageGradePercentage: Math.round(avgGrades * 100) / 100
      },
      subjectWise: subjectPerformance,
      generatedAt: new Date()
    };
  } catch (error) {
    throw new Error(`Error generating faculty performance report: ${error.message}`);
  }
};

// Get faculty dashboard summary
const getFacultyDashboardSummary = async (facultyId) => {
  try {
    // Get today's schedule
    const today = new Date();
    const dayName = today.toLocaleLowerCase().slice(0, 3); // mon, tue, etc.

    const todaySubjects = await Subject.find({
      $or: [
        { 'faculty.theory': facultyId },
        { 'faculty.practical': facultyId }
      ],
      'schedule.day': { $regex: dayName, $options: 'i' },
      isActive: true
    }).populate('department', 'name');

    // Get pending tasks
    const pendingLeaves = await Leave.countDocuments({
      'approvalWorkflow.approver': facultyId,
      'approvalWorkflow.status': 'pending'
    });

    const draftGrades = await Grade.countDocuments({
      faculty: facultyId,
      status: 'draft'
    });

    // Get recent activity
    const recentAttendance = await Attendance.find({
      faculty: facultyId,
      date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    })
    .populate('subject', 'name code')
    .sort({ date: -1 })
    .limit(5);

    const recentGrades = await Grade.find({
      faculty: facultyId,
      status: 'published',
      publishedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    })
    .populate('subject', 'name code')
    .sort({ publishedAt: -1 })
    .limit(5);

    return {
      todaySchedule: todaySubjects.map(subject => ({
        id: subject._id,
        name: subject.name,
        code: subject.code,
        department: subject.department.name,
        schedule: subject.schedule.filter(s => 
          s.day.toLowerCase().includes(dayName)
        )
      })),
      pendingTasks: {
        leaveApprovals: pendingLeaves,
        draftGrades
      },
      recentActivity: {
        attendance: recentAttendance.map(att => ({
          subject: att.subject,
          date: att.date,
          classType: att.classType
        })),
        grades: recentGrades.map(grade => ({
          subject: grade.subject,
          assessmentName: grade.assessmentName,
          publishedAt: grade.publishedAt
        }))
      }
    };
  } catch (error) {
    throw new Error(`Error getting faculty dashboard summary: ${error.message}`);
  }
};

// Calculate faculty efficiency metrics
const calculateFacultyEfficiency = async (facultyId, academicYear) => {
  try {
    // Get all subjects taught by faculty
    const subjects = await Subject.find({
      $or: [
        { 'faculty.theory': facultyId },
        { 'faculty.practical': facultyId }
      ],
      academicYear,
      isActive: true
    });

    const efficiency = await Promise.all(
      subjects.map(async (subject) => {
        // Calculate attendance marking consistency
        const expectedClasses = subject.attendanceConfig?.totalClasses || 60; // Default expected classes
        const actualClassesConducted = await Attendance.countDocuments({
          subject: subject._id,
          faculty: facultyId
        });

        const attendanceConsistency = expectedClasses > 0 
          ? (actualClassesConducted / expectedClasses) * 100 
          : 0;

        // Calculate grading timeliness
        const totalGrades = await Grade.countDocuments({
          subject: subject._id,
          faculty: facultyId
        });

        const publishedGrades = await Grade.countDocuments({
          subject: subject._id,
          faculty: facultyId,
          status: 'published'
        });

        const gradingEfficiency = totalGrades > 0 
          ? (publishedGrades / totalGrades) * 100 
          : 0;

        // Calculate student performance under this faculty
        const avgStudentPerformance = await Grade.aggregate([
          {
            $match: {
              subject: subject._id,
              faculty: facultyId,
              status: 'published'
            }
          },
          {
            $group: {
              _id: null,
              avgPercentage: { $avg: '$percentage' },
              passRate: {
                $avg: {
                  $cond: [{ $ne: ['$grade', 'F'] }, 1, 0]
                }
              }
            }
          }
        ]);

        return {
          subject: {
            id: subject._id,
            name: subject.name,
            code: subject.code
          },
          metrics: {
            attendanceConsistency: Math.min(Math.round(attendanceConsistency), 100),
            gradingEfficiency: Math.round(gradingEfficiency),
            studentAvgPerformance: avgStudentPerformance[0]?.avgPercentage || 0,
            studentPassRate: (avgStudentPerformance[0]?.passRate * 100) || 0
          }
        };
      })
    );

    // Calculate overall efficiency score
    const overallAttendanceConsistency = efficiency.length > 0 
      ? efficiency.reduce((sum, e) => sum + e.metrics.attendanceConsistency, 0) / efficiency.length
      : 0;

    const overallGradingEfficiency = efficiency.length > 0 
      ? efficiency.reduce((sum, e) => sum + e.metrics.gradingEfficiency, 0) / efficiency.length
      : 0;

    const overallStudentPerformance = efficiency.length > 0 
      ? efficiency.reduce((sum, e) => sum + e.metrics.studentAvgPerformance, 0) / efficiency.length
      : 0;

    const efficiencyScore = (overallAttendanceConsistency + overallGradingEfficiency) / 2;

    return {
      overall: {
        efficiencyScore: Math.round(efficiencyScore),
        attendanceConsistency: Math.round(overallAttendanceConsistency),
        gradingEfficiency: Math.round(overallGradingEfficiency),
        studentPerformance: Math.round(overallStudentPerformance),
        rating: efficiencyScore >= 90 ? 'excellent' : 
                efficiencyScore >= 75 ? 'good' : 
                efficiencyScore >= 60 ? 'satisfactory' : 'needs_improvement'
      },
      subjectWise: efficiency
    };
  } catch (error) {
    throw new Error(`Error calculating faculty efficiency: ${error.message}`);
  }
};

module.exports = {
  getFacultyWorkload,
  generateFacultyPerformanceReport,
  getFacultyDashboardSummary,
  calculateFacultyEfficiency
};