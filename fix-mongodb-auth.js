#!/usr/bin/env node

/**
 * MongoDB Authentication Fixer for PSN College ERP
 * This script helps you test and fix MongoDB connection issues
 */

const mongoose = require('mongoose');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🔧 MongoDB Authentication Fixer\n');

console.log('Current connection string format:');
console.log('mongodb+srv://psn_admin:PASSWORD@psn-college-cluster.6ntxbjy.mongodb.net/psn_college_erp?retryWrites=true&w=majority\n');

console.log('🔍 Common issues:');
console.log('1. Wrong password');
console.log('2. User doesn\'t exist');
console.log('3. Password has special characters that need URL encoding');
console.log('4. Network access not configured\n');

rl.question('🔑 Enter your MongoDB Atlas password: ', (password) => {
    // URL encode the password
    const encodedPassword = encodeURIComponent(password);
    
    const connectionString = `mongodb+srv://psn_admin:${encodedPassword}@psn-college-cluster.6ntxbjy.mongodb.net/psn_college_erp?retryWrites=true&w=majority`;
    
    console.log('\n🔗 Testing connection with encoded password...');
    console.log(`Connection: mongodb+srv://psn_admin:***@psn-college-cluster.6ntxbjy.mongodb.net/...`);
    
    mongoose.connect(connectionString, {
        serverSelectionTimeoutMS: 5000
    })
    .then(() => {
        console.log('\n✅ SUCCESS! Connection working!');
        console.log('\n📝 Update your .env file with this connection string:');
        console.log(`MONGODB_URI=${connectionString}\n`);
        
        // Test basic operations
        return mongoose.connection.db.admin().listDatabases();
    })
    .then((result) => {
        console.log('📋 Available databases:');
        result.databases.forEach(db => {
            console.log(`   • ${db.name}`);
        });
        console.log('\n🎉 Your MongoDB connection is working perfectly!');
        process.exit(0);
    })
    .catch((error) => {
        console.log('\n❌ Connection failed:', error.message);
        
        if (error.message.includes('bad auth')) {
            console.log('\n💡 Authentication failed. Try these solutions:');
            console.log('1. Go to MongoDB Atlas → Database Access');
            console.log('2. Check if user "psn_admin" exists');
            console.log('3. Reset the password for "psn_admin"');
            console.log('4. Make sure password is correct');
        }
        
        if (error.message.includes('timed out')) {
            console.log('\n💡 Connection timeout. Try these solutions:');
            console.log('1. Go to MongoDB Atlas → Network Access');
            console.log('2. Add IP address 0.0.0.0/0 (Allow from anywhere)');
            console.log('3. Check your internet connection');
        }
        
        process.exit(1);
    })
    .finally(() => {
        rl.close();
    });
});