#!/usr/bin/env node

/**
 * Test PSN College ERP Startup
 * Checks all configurations before starting the server
 */

require('dotenv').config();

console.log('🔧 PSN College ERP Startup Test\n');

// Test 1: Environment Variables
console.log('1️⃣  Checking Environment Variables...');
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'];
let envOk = true;

requiredEnvVars.forEach(varName => {
    if (process.env[varName]) {
        console.log(`   ✅ ${varName}: DEFINED`);
    } else {
        console.log(`   ❌ ${varName}: MISSING`);
        envOk = false;
    }
});

if (!envOk) {
    console.log('\n❌ Missing required environment variables!');
    console.log('💡 Check your .env file\n');
    process.exit(1);
}

// Test 2: Load Models
console.log('\n2️⃣  Loading Models...');
try {
    require('./models/User');
    console.log('   ✅ User model');
    require('./models/Department');
    console.log('   ✅ Department model');
    require('./models/Subject');
    console.log('   ✅ Subject model');
    require('./models/Attendance');
    console.log('   ✅ Attendance model');
    require('./models/Grade');
    console.log('   ✅ Grade model');
    require('./models/Leave');
    console.log('   ✅ Leave model');
    require('./models/AcademicYear');
    console.log('   ✅ AcademicYear model');
} catch (error) {
    console.log(`   ❌ Model loading failed: ${error.message}`);
    process.exit(1);
}

// Test 3: Database Connection
console.log('\n3️⃣  Testing Database Connection...');
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('   ✅ MongoDB Connected Successfully!');
        console.log(`   📍 Database: ${mongoose.connection.name}`);
        console.log(`   🌐 Host: ${mongoose.connection.host}`);
        
        console.log('\n🎉 All Startup Tests Passed!');
        console.log('✅ Your PSN College ERP is ready to start\n');
        console.log('Run: npm start');
        
        mongoose.connection.close();
        process.exit(0);
    })
    .catch(error => {
        console.log(`   ❌ Database Connection Failed`);
        console.log(`   Error: ${error.message}\n`);
        
        if (error.message.includes('bad auth')) {
            console.log('💡 Fix: Update MONGODB_URI in .env with correct password');
            console.log('   See: FIX-AUTHENTICATION.md\n');
        }
        
        if (error.message.includes('timed out')) {
            console.log('💡 Fix: Check MongoDB Atlas Network Access');
            console.log('   Add IP: 0.0.0.0/0 (Allow from anywhere)\n');
        }
        
        process.exit(1);
    });