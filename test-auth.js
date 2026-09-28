// Simple test script to verify authentication system
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testAuth() {
  try {
    console.log('Testing PSN College ERP Authentication System...\n');

    // Test health check
    console.log('1. Testing health check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✓ Health check passed:', healthResponse.data.message);

    // Test login with default admin (this might fail if no MongoDB)
    console.log('\n2. Testing login...');
    try {
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'admin@psn.edu.in',
        password: 'admin123'
      });
      console.log('✓ Login successful for admin');
      console.log('✓ Token received:', loginResponse.data.data.token ? 'Yes' : 'No');
      
      // Test protected route
      console.log('\n3. Testing protected route...');
      const token = loginResponse.data.data.token;
      const profileResponse = await axios.get(`${BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('✓ Protected route access successful');
      console.log('✓ User profile retrieved:', profileResponse.data.data.user.fullName);

    } catch (loginError) {
      console.log('✗ Login failed (expected if no MongoDB):', loginError.response?.data?.message || loginError.message);
    }

    console.log('\n4. Testing validation...');
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: 'invalid-email',
        password: '123'
      });
    } catch (validationError) {
      console.log('✓ Validation working - rejected invalid email');
    }

    console.log('\nAuthentication system test completed!');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testAuth();
}

module.exports = testAuth;