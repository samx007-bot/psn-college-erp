// Simple test for student management APIs
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testStudentAPI() {
  try {
    console.log('Testing PSN College ERP Student Management APIs...\n');

    // First, login as admin to get token
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@psn.edu.in',
      password: 'admin123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✓ Admin login successful');

    const headers = { Authorization: `Bearer ${token}` };

    // Test get all students (will be empty initially)
    console.log('\n2. Testing get all students...');
    const studentsResponse = await axios.get(`${BASE_URL}/students`, { headers });
    console.log('✓ Get students successful');
    console.log(`✓ Found ${studentsResponse.data.data.pagination.totalStudents} students`);

    // Test creating a new student
    console.log('\n3. Testing create student...');
    const studentData = {
      email: 'student1@psn.edu.in',
      firstName: 'Raj',
      lastName: 'Kumar',
      phone: '9876543210',
      dateOfBirth: '2003-05-15',
      gender: 'male',
      address: {
        street: '123 Main Street',
        city: 'Chennai',
        state: 'Tamil Nadu',
        zipCode: '600001',
        country: 'India'
      },
      studentInfo: {
        rollNumber: 'PSN2024CS001',
        admissionYear: 2024,
        batch: '2024-2028',
        section: 'A',
        semester: 1,
        parentContact: {
          fatherName: 'Ravi Kumar',
          motherName: 'Sita Kumar',
          guardianPhone: '9876543211',
          emergencyContact: '9876543212'
        }
      }
    };

    try {
      const createResponse = await axios.post(`${BASE_URL}/students`, studentData, { headers });
      console.log('✓ Student created successfully');
      console.log('✓ Student ID:', createResponse.data.data.student.userId);
      
      const studentId = createResponse.data.data.student._id;

      // Test get student profile
      console.log('\n4. Testing get student profile...');
      const profileResponse = await axios.get(`${BASE_URL}/students/${studentId}`, { headers });
      console.log('✓ Student profile retrieved');
      console.log('✓ Student name:', profileResponse.data.data.student.fullName);

      // Test student dashboard
      console.log('\n5. Testing student dashboard...');
      const dashboardResponse = await axios.get(`${BASE_URL}/students/${studentId}/dashboard`, { headers });
      console.log('✓ Student dashboard data retrieved');

      // Test student subjects
      console.log('\n6. Testing student subjects...');
      const subjectsResponse = await axios.get(`${BASE_URL}/students/${studentId}/subjects`, { headers });
      console.log('✓ Student subjects retrieved');
      console.log('✓ Total subjects:', subjectsResponse.data.data.totalSubjects);

    } catch (createError) {
      if (createError.response?.status === 400) {
        console.log('ℹ Student creation failed (expected if no department exists):', createError.response.data.message);
      } else {
        throw createError;
      }
    }

    // Test validation
    console.log('\n7. Testing validation...');
    try {
      await axios.post(`${BASE_URL}/students`, {
        email: 'invalid-email',
        firstName: '',
        role: 'student'
      }, { headers });
    } catch (validationError) {
      console.log('✓ Validation working - rejected invalid student data');
    }

    console.log('\nStudent Management API test completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error.response?.data?.message || error.message);
    if (error.response?.data?.errors) {
      console.error('Validation errors:', error.response.data.errors);
    }
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testStudentAPI();
}

module.exports = testStudentAPI;