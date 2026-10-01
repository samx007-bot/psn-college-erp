#!/usr/bin/env node

/**
 * Quick MongoDB Connection Tester
 * Usage: node test-mongo-connection.js "your_connection_string"
 */

const mongoose = require('mongoose');

const testConnection = async (uri) => {
    try {
        console.log('🔧 Testing MongoDB Connection...\n');
        
        // Mask password in display
        const displayUri = uri.replace(/:([^:@]+)@/, ':***@');
        console.log(`🔗 Connecting to: ${displayUri}\n`);
        
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000
        });
        
        console.log('✅ SUCCESS! Connected to MongoDB Atlas!\n');
        
        // Try to list databases
        const admin = mongoose.connection.db.admin();
        const result = await admin.listDatabases();
        
        console.log('📋 Available databases:');
        result.databases.forEach(db => {
            console.log(`   • ${db.name}`);
        });
        
        console.log('\n🎉 Connection working perfectly!');
        console.log('✅ You can now use this connection string in your .env file\n');
        
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ CONNECTION FAILED\n');
        console.error(`Error: ${error.message}\n`);
        
        if (error.message.includes('bad auth')) {
            console.log('💡 Authentication Failed - Try these solutions:');
            console.log('   1. Check your username and password are correct');
            console.log('   2. Reset password in MongoDB Atlas > Database Access');
            console.log('   3. URL encode special characters in password');
            console.log('   4. Make sure the database user exists\n');
        }
        
        if (error.message.includes('timed out')) {
            console.log('💡 Connection Timeout - Try these solutions:');
            console.log('   1. Check Network Access in MongoDB Atlas');
            console.log('   2. Add IP 0.0.0.0/0 to allow all connections');
            console.log('   3. Check your internet connection');
            console.log('   4. Verify cluster is running\n');
        }
        
        if (error.message.includes('ENOTFOUND')) {
            console.log('💡 Host Not Found - Try these solutions:');
            console.log('   1. Check the cluster hostname in connection string');
            console.log('   2. Verify your cluster is active in MongoDB Atlas');
            console.log('   3. Copy connection string directly from Atlas\n');
        }
        
        process.exit(1);
    } finally {
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }
    }
};

// Get connection string from command line or environment
const connectionString = process.argv[2] || process.env.MONGODB_URI;

if (!connectionString) {
    console.log('❌ No connection string provided!\n');
    console.log('Usage:');
    console.log('  node test-mongo-connection.js "mongodb+srv://user:pass@cluster.mongodb.net/database"\n');
    console.log('Or set MONGODB_URI in your .env file and run:');
    console.log('  node test-mongo-connection.js\n');
    process.exit(1);
}

testConnection(connectionString);