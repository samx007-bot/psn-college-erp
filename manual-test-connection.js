#!/usr/bin/env node

/**
 * Manual MongoDB Connection Tester
 * Test different connection strings manually
 */

const mongoose = require('mongoose');

const testConnections = [
    // Test with different possible usernames/passwords
    'mongodb+srv://psn_admin:PsnCollege2024@psn-college-cluster.6ntxbjy.mongodb.net/psn_college_erp?retryWrites=true&w=majority',
    'mongodb+srv://psn_admin:111psn000@psn-college-cluster.6ntxbjy.mongodb.net/psn_college_erp?retryWrites=true&w=majority',
    // Add more test connections as needed
];

console.log('🔧 Testing Multiple Connection Strings...\n');

async function testConnection(uri, index) {
    try {
        console.log(`${index + 1}. Testing connection...`);
        const maskedUri = uri.replace(/:([^:@]+)@/, ':***@');
        console.log(`   URI: ${maskedUri}`);
        
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000
        });
        
        console.log('   ✅ SUCCESS! This connection works!');
        console.log('\n🎉 Working connection string found!');
        console.log('📝 Update your .env file with:');
        console.log(`MONGODB_URI=${uri}\n`);
        
        await mongoose.connection.close();
        return true;
    } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        return false;
    }
}

async function testAll() {
    for (let i = 0; i < testConnections.length; i++) {
        const success = await testConnection(testConnections[i], i);
        if (success) {
            process.exit(0);
        }
        console.log('');
    }
    
    console.log('❌ All connection attempts failed.');
    console.log('\n💡 Next steps:');
    console.log('1. Go to MongoDB Atlas and reset your password');
    console.log('2. Make sure the database user exists');
    console.log('3. Check network access settings (allow 0.0.0.0/0)');
    console.log('4. Get the connection string directly from Atlas');
    process.exit(1);
}

testAll();