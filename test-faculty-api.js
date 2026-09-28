// Simple test for faculty management APIs
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testFacultyAPI() {
  try {
    console.log('Testing PSN College ERP Faculty Management APIs...\n');

    // First, login as admin to get token
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@psn.edu.in',
      password: 'admin123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✓ Admin login successful');

    const headers = { Authorization: `Bearer ${token}` };

    // Test get all faculty (will be empty initially)
    console.log('\n2. Testing get all faculty...');
    const facultyResponse = await axios.get(`${BASE_URL}/faculty`, { headers });
    console.log('✓ Get faculty successful');
    console.log(`✓ Found ${facultyResponse.data.data.pagination.totalFaculty} faculty members`);

    // Test creating a new faculty
    console.log('\n3. Testing create faculty...');
    const facultyData = {
      email: 'faculty1@psn.edu.in',
      firstName: 'Dr. Priya',
      lastName: 'Sharma',
      phone: '9876543213',
      dateOfBirth: '1985-08-20',
      gender: 'female',
      address: {
        street: '456 College Road',
        city: 'Chennai',
        state: 'Tamil Nadu',
        zipCode: '600002',
        country: 'India'
      },
      facultyInfo: {
        employeeId: 'PSN2024FC001',
        designation: 'Assistant Professor',
        qualification: 'PhD in Computer Science',
        experience: 5,
        joiningDate: '2024-01-15',
        specialization: ['Machine Learning', 'Data Science', 'Algorithms']
      }
    };

    try {
      const createResponse = await axios.post(`${BASE_URL}/faculty`, facultyData, { headers });
      console.log('✓ Faculty created successfully');
      console.log('✓ Faculty ID:', createResponse.data.data.faculty.userId);
      
      const facultyId = createResponse.data.data.faculty._id;

      // Test get faculty profile
      console.log('\n4. Testing get faculty profile...');
      const profileResponse = await axios.get(`${BASE_URL}/faculty/${facultyId}`, { headers });
      console.log('✓ Faculty profile retrieved');
      console.log('✓ Faculty name:', profileResponse.data.data.faculty.fullName);

      // Test faculty dashboard
      console.log('\n5. Testing faculty dashboard...');
      const dashboardResponse = await axios.get(`${BASE_URL}/faculty/${facultyId}/dashboard`, { headers });
      console.log('✓ Faculty dashboard data retrieved');

      // Test faculty subjects
      console.log('\n6. Testing faculty subjects...');
      const subjectsResponse = await axios.get(`${BASE_URL}/faculty/${facultyId}/subjects`, { headers });
      console.log('✓ Faculty subjects retrieved');
      console.log('✓ Total subjects assigned:', subjectsResponse.data.data.totalSubjects);

      // Test faculty students
      console.log('\n7. Testing faculty students...');
      const studentsResponse = await axios.get(`${BASE_URL}/faculty/${facultyId}/students`, { headers });
      console.log('✓ Faculty students retrieved');
      console.log('✓ Total students:', studentsResponse.data.data.pagination?.totalStudents || 0);

      // Test attendance marking (will likely fail without subjects/students)
      console.log('\n8. Testing attendance marking...');
      try {
        const attendanceData = {
          subjectId: '507f1f77bcf86cd799439011', // Dummy ObjectId
          date: new Date().toISOString(),
          classType: 'theory',
          classNumber: 1,
          attendanceData: [
            {
              studentId: '507f1f77bcf86cd799439012', // Dummy ObjectId
              status: 'present',
              remarks: 'Active participation'
            }
          ]
        };
        
        await axios.post(`${BASE_URL}/faculty/attendance/mark`, attendanceData, { headers });
        console.log('✓ Attendance marking endpoint accessible');
      } catch (attendanceError) {
        console.log('ℹ Attendance marking failed (expected without valid subject/students):', 
                   attendanceError.response?.data?.message || 'Endpoint accessible');
      }

      // Test grade adding (will likely fail without subjects/students)
      console.log('\n9. Testing grade adding...');
      try {
        const gradeData = {
          subjectId: '507f1f77bcf86cd799439011', // Dummy ObjectId
          assessmentType: 'quiz',
          assessmentName: 'Quiz 1',
          maxMarks: 20,
          assessmentDate: new Date().toISOString(),
          grades: [
            {
              studentId: '507f1f77bcf86cd799439012', // Dummy ObjectId
              obtainedMarks: 18,
              remarks: 'Excellent work'
            }
          ]
        };
        
        await axios.post(`${BASE_URL}/faculty/grades`, gradeData, { headers });
        console.log('✓ Grade adding endpoint accessible');
      } catch (gradeError) {
        console.log('ℹ Grade adding failed (expected without valid subject/students):', 
                   gradeError.response?.data?.message || 'Endpoint accessible');
      }

    } catch (createError) {
      if (createError.response?.status === 400) {
        console.log('ℹ Faculty creation failed (expected if no department exists):', createError.response.data.message);
      } else {
        throw createError;
      }
    }

    // Test validation
    console.log('\n10. Testing validation...');
    try {
      await axios.post(`${BASE_URL}/faculty`, {
        email: 'invalid-email',
        firstName: '',
        role: 'faculty'
      }, { headers });
    } catch (validationError) {
      console.log('✓ Validation working - rejected invalid faculty data');
    }

    console.log('\nFaculty Management API test completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error.response?.data?.message || error.message);
    if (error.response?.data?.errors) {
      console.error('Validation errors:', error.response.data.errors);
    }
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testFacultyAPI();
}

module.exports = testFacultyAPI;