const { User, Attendance, Grade, Subject, AcademicYear } = require('../models');

// Calculate student's overall academic performance
const calculateStudentPerformance = async (studentId, academicYear, semester) => {
  try {
    // Get attendance percentage
    const attendanceSummary = await Attendance.getStudentAttendanceSummary(
      studentId,
      academicYear,
      semester
    );

    // Calculate overall attendance percentage
    let totalClasses = 0;
    let totalPresent = 0;
    
    attendanceSummary.forEach(subject => {
      totalClasses += subject.totalClasses;
      totalPresent += subject.presentClasses;
    });

    const overallAttendancePercentage = totalClasses > 0 
      ? Math.round((totalPresent / totalClasses) * 100 * 100) / 100
      : 0;

    // Get CGPA
    const cgpa = await Grade.calculateCGPA(studentId, academicYear, semester);

    // Get subjects with low attendance
    const lowAttendanceSubjects = attendanceSummary.filter(
      subject => subject.isShortAttendance
    );

    // Get recent performance trend (last 5 assessments)
    const recentGrades = await Grade.find({
      student: studentId,
      academicYear,
      ...(semester && { semester }),
      status: 'published'
    })
    .sort({ assessmentDate: -1 })
    .limit(5)
    .populate('subject', 'name code');

    const performanceTrend = calculateTrend(recentGrades);

    return {
      attendance: {
        overall: overallAttendancePercentage,
        subjects: attendanceSummary,
        lowAttendanceSubjects: lowAttendanceSubjects.length,
        criticalSubjects: lowAttendanceSubjects.map(s => s.subjectName)
      },
      academics: {
        cgpa,
        totalSubjects: attendanceSummary.length,
        recentGrades: recentGrades.length,
        trend: performanceTrend
      }
    };
  } catch (error) {
    throw new Error(`Error calculating student performance: ${error.message}`);
  }
};

// Calculate performance trend based on recent grades
const calculateTrend = (grades) => {
  if (grades.length < 2) return 'insufficient_data';

  const recentAvg = grades.slice(0, Math.ceil(grades.length / 2))
    .reduce((sum, grade) => sum + grade.percentage, 0) / Math.ceil(grades.length / 2);

  const olderAvg = grades.slice(Math.ceil(grades.length / 2))
    .reduce((sum, grade) => sum + grade.percentage, 0) / Math.floor(grades.length / 2);

  const difference = recentAvg - olderAvg;

  if (difference > 5) return 'improving';
  if (difference < -5) return 'declining';
  return 'stable';
};

// Generate student report card
const generateReportCard = async (studentId, academicYear, semester) => {
  try {
    // Get student information
    const student = await User.findById(studentId)
      .populate('studentInfo.department', 'name code');

    if (!student || student.role !== 'student') {
      throw new Error('Student not found');
    }

    // Get academic year information
    const academicYearInfo = await AcademicYear.findOne({ year: academicYear });

    // Get all grades for the semester
    const grades = await Grade.find({
      student: studentId,
      academicYear,
      semester,
      status: 'published'
    })
    .populate('subject', 'name code credits type')
    .sort({ assessmentDate: 1 });

    // Group grades by subject
    const subjectGrades = {};
    grades.forEach(grade => {
      const subjectId = grade.subject._id.toString();
      if (!subjectGrades[subjectId]) {
        subjectGrades[subjectId] = {
          subject: grade.subject,
          assessments: [],
          totalMarks: 0,
          maxMarks: 0,
          percentage: 0,
          grade: '',
          credits: grade.subject.credits.total
        };
      }
      
      subjectGrades[subjectId].assessments.push({
        type: grade.assessmentType,
        name: grade.assessmentName,
        maxMarks: grade.maxMarks,
        obtainedMarks: grade.obtainedMarks,
        percentage: grade.percentage,
        grade: grade.grade,
        date: grade.assessmentDate
      });

      subjectGrades[subjectId].totalMarks += grade.obtainedMarks * grade.weightage;
      subjectGrades[subjectId].maxMarks += grade.maxMarks * grade.weightage;
    });

    // Calculate subject-wise performance
    Object.keys(subjectGrades).forEach(subjectId => {
      const subject = subjectGrades[subjectId];
      if (subject.maxMarks > 0) {
        subject.percentage = Math.round((subject.totalMarks / subject.maxMarks) * 100 * 100) / 100;
        subject.grade = calculateGradeFromPercentage(subject.percentage);
      }
    });

    // Get attendance summary
    const attendanceSummary = await Attendance.getStudentAttendanceSummary(
      studentId,
      academicYear,
      semester
    );

    // Calculate CGPA
    const cgpa = await Grade.calculateCGPA(studentId, academicYear, semester);

    return {
      student: {
        name: student.fullName,
        rollNumber: student.studentInfo.rollNumber,
        department: student.studentInfo.department.name,
        semester,
        academicYear
      },
      academicInfo: {
        cgpa,
        totalCredits: Object.values(subjectGrades).reduce((sum, s) => sum + s.credits, 0)
      },
      subjects: Object.values(subjectGrades),
      attendance: attendanceSummary,
      generatedAt: new Date()
    };
  } catch (error) {
    throw new Error(`Error generating report card: ${error.message}`);
  }
};

// Calculate grade from percentage
const calculateGradeFromPercentage = (percentage) => {
  if (percentage >= 90) return 'O';
  if (percentage >= 80) return 'A+';
  if (percentage >= 70) return 'A';
  if (percentage >= 60) return 'B+';
  if (percentage >= 50) return 'B';
  if (percentage >= 40) return 'C';
  if (percentage >= 35) return 'P';
  return 'F';
};

// Check attendance eligibility for exams
const checkAttendanceEligibility = async (studentId, academicYear, semester) => {
  const attendanceSummary = await Attendance.getStudentAttendanceSummary(
    studentId,
    academicYear,
    semester
  );

  const eligibilityResults = attendanceSummary.map(subject => ({
    subjectId: subject._id,
    subjectName: subject.subjectName,
    subjectCode: subject.subjectCode,
    attendancePercentage: subject.attendancePercentage,
    isEligible: !subject.isShortAttendance,
    shortagePercentage: subject.isShortAttendance 
      ? (subject.attendancePercentage - 75) 
      : 0
  }));

  const ineligibleSubjects = eligibilityResults.filter(s => !s.isEligible);

  return {
    overall: ineligibleSubjects.length === 0,
    subjects: eligibilityResults,
    ineligibleCount: ineligibleSubjects.length,
    message: ineligibleSubjects.length > 0 
      ? `Not eligible for ${ineligibleSubjects.length} subject(s) due to low attendance`
      : 'Eligible for all subjects'
  };
};

// Generate student academic alerts
const generateAcademicAlerts = async (studentId, academicYear, semester) => {
  const alerts = [];

  try {
    // Check attendance
    const attendanceSummary = await Attendance.getStudentAttendanceSummary(
      studentId,
      academicYear,
      semester
    );

    const lowAttendanceSubjects = attendanceSummary.filter(s => s.isShortAttendance);
    if (lowAttendanceSubjects.length > 0) {
      alerts.push({
        type: 'attendance',
        severity: 'high',
        message: `Low attendance in ${lowAttendanceSubjects.length} subject(s)`,
        subjects: lowAttendanceSubjects.map(s => s.subjectName),
        action: 'Improve attendance to maintain eligibility'
      });
    }

    // Check recent grades
    const recentGrades = await Grade.find({
      student: studentId,
      academicYear,
      semester,
      status: 'published'
    })
    .sort({ assessmentDate: -1 })
    .limit(5);

    const failingGrades = recentGrades.filter(g => g.grade === 'F');
    if (failingGrades.length > 0) {
      alerts.push({
        type: 'academic',
        severity: 'high',
        message: `Failing in ${failingGrades.length} recent assessment(s)`,
        action: 'Seek academic support immediately'
      });
    }

    // Check CGPA
    const cgpa = await Grade.calculateCGPA(studentId, academicYear, semester);
    if (cgpa < 5.0) {
      alerts.push({
        type: 'cgpa',
        severity: 'medium',
        message: `CGPA (${cgpa}) is below 5.0`,
        action: 'Focus on improving grades'
      });
    }

    return alerts;
  } catch (error) {
    throw new Error(`Error generating academic alerts: ${error.message}`);
  }
};

module.exports = {
  calculateStudentPerformance,
  generateReportCard,
  checkAttendanceEligibility,
  generateAcademicAlerts,
  calculateGradeFromPercentage
};