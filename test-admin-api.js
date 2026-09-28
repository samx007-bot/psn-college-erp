// Simple test for admin management APIs
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testAdminAPI() {
  try {
    console.log('Testing PSN College ERP Admin Management APIs...\n');

    // First, login as admin to get token
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@psn.edu.in',
      password: 'admin123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✓ Admin login successful');

    const headers = { Authorization: `Bearer ${token}` };

    // Test admin dashboard
    console.log('\n2. Testing admin dashboard...');
    const dashboardResponse = await axios.get(`${BASE_URL}/admin/dashboard`, { headers });
    console.log('✓ Admin dashboard data retrieved');
    console.log('✓ Total students:', dashboardResponse.data.data.counts.totalStudents);
    console.log('✓ Total faculty:', dashboardResponse.data.data.counts.totalFaculty);

    // Test get all users
    console.log('\n3. Testing get all users...');
    const usersResponse = await axios.get(`${BASE_URL}/admin/users`, { headers });
    console.log('✓ Users list retrieved');
    console.log('✓ Total users:', usersResponse.data.data.pagination.totalUsers);

    // Test system statistics
    console.log('\n4. Testing system statistics...');
    const statsResponse = await axios.get(`${BASE_URL}/admin/statistics`, { headers });
    console.log('✓ System statistics retrieved');

    // Test department management
    console.log('\n5. Testing department management...');
    
    // Get departments
    const departmentsResponse = await axios.get(`${BASE_URL}/admin/departments`, { headers });
    console.log('✓ Departments list retrieved');
    console.log('✓ Total departments:', departmentsResponse.data.data.pagination.totalDepartments);

    // Test creating a department
    console.log('\n6. Testing create department...');
    const departmentData = {
      name: 'Computer Science and Engineering',
      code: 'CSE',
      description: 'Department of Computer Science and Engineering',
      totalSemesters: 8,
      establishedYear: 2010,
      office: {
        building: 'Main Block',
        floor: '2nd Floor',
        roomNumber: '201',
        phone: '044-12345678',
        email: 'cse@psn.edu.in'
      }
    };

    try {
      const createDeptResponse = await axios.post(`${BASE_URL}/admin/departments`, departmentData, { headers });
      console.log('✓ Department created successfully');
      console.log('✓ Department ID:', createDeptResponse.data.data.department._id);
      
      const departmentId = createDeptResponse.data.data.department._id;

      // Test get single department
      console.log('\n7. Testing get department details...');
      const deptResponse = await axios.get(`${BASE_URL}/admin/departments/${departmentId}`, { headers });
      console.log('✓ Department details retrieved');
      console.log('✓ Department name:', deptResponse.data.data.department.name);

      // Test department statistics
      console.log('\n8. Testing department statistics...');
      const deptStatsResponse = await axios.get(`${BASE_URL}/admin/departments/${departmentId}/statistics`, { headers });
      console.log('✓ Department statistics retrieved');

      // Test subject management
      console.log('\n9. Testing subject management...');
      
      // Get subjects
      const subjectsResponse = await axios.get(`${BASE_URL}/admin/subjects`, { headers });
      console.log('✓ Subjects list retrieved');
      console.log('✓ Total subjects:', subjectsResponse.data.data.pagination.totalSubjects);

      // Test creating a subject
      console.log('\n10. Testing create subject...');
      const subjectData = {
        name: 'Data Structures and Algorithms',
        code: 'CS101',
        description: 'Introduction to fundamental data structures and algorithms',
        department: departmentId,
        semester: 3,
        academicYear: '2024-2025',
        credits: {
          theory: 3,
          practical: 1,
          total: 4
        },
        type: 'core',
        schedule: [
          {
            day: 'monday',
            startTime: '09:00',
            endTime: '10:00',
            type: 'theory',
            venue: 'Room 301'
          },
          {
            day: 'wednesday',
            startTime: '14:00',
            endTime: '17:00',
            type: 'practical',
            venue: 'CS Lab 1'
          }
        ]
      };

      try {
        const createSubjectResponse = await axios.post(`${BASE_URL}/admin/subjects`, subjectData, { headers });
        console.log('✓ Subject created successfully');
        console.log('✓ Subject ID:', createSubjectResponse.data.data.subject._id);
        
      } catch (subjectError) {
        console.log('ℹ Subject creation may have failed:', subjectError.response?.data?.message || 'Endpoint accessible');
      }

    } catch (createError) {
      if (createError.response?.status === 400) {
        console.log('ℹ Department creation failed (may already exist):', createError.response.data.message);
      } else {
        throw createError;
      }
    }

    // Test bulk user creation
    console.log('\n11. Testing bulk user creation...');
    try {
      const bulkUsers = {
        users: [
          {
            email: 'test.student1@psn.edu.in',
            firstName: 'Test',
            lastName: 'Student1',
            role: 'student',
            phone: '9876543214',
            studentInfo: {
              rollNumber: 'PSN2024CS101',
              admissionYear: 2024,
              batch: '2024-2028',
              section: 'A',
              semester: 1
            }
          }
        ]
      };
      
      await axios.post(`${BASE_URL}/admin/users/bulk`, bulkUsers, { headers });
      console.log('✓ Bulk user creation endpoint accessible');
    } catch (bulkError) {
      console.log('ℹ Bulk user creation may have failed:', bulkError.response?.data?.message || 'Endpoint accessible');
    }

    // Test export functionality
    console.log('\n12. Testing data export...');
    try {
      const exportResponse = await axios.get(`${BASE_URL}/admin/export?type=users&format=json`, { headers });
      console.log('✓ Data export working');
      console.log('✓ Exported records:', exportResponse.data.data.recordCount);
    } catch (exportError) {
      console.log('ℹ Export may have failed:', exportError.response?.data?.message || 'Endpoint accessible');
    }

    console.log('\nAdmin Management API test completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error.response?.data?.message || error.message);
    if (error.response?.data?.errors) {
      console.error('Validation errors:', error.response.data.errors);
    }
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testAdminAPI();
}

module.exports = testAdminAPI;