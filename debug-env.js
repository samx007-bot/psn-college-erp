#!/usr/bin/env node

console.log('🔧 Debug Environment Variables\n');

// Check if .env file exists
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
console.log(`📁 Looking for .env at: ${envPath}`);
console.log(`📄 .env file exists: ${fs.existsSync(envPath) ? 'YES' : 'NO'}`);

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    console.log(`📏 .env file size: ${envContent.length} characters`);
    
    // Check for MONGODB_URI line
    const mongoLine = envContent.split('\n').find(line => line.includes('MONGODB_URI'));
    console.log(`🔍 MONGODB_URI line found: ${mongoLine ? 'YES' : 'NO'}`);
    if (mongoLine) {
        console.log(`📝 Line: ${mongoLine.substring(0, 50)}...`);
    }
}

console.log('\n🔧 Loading dotenv...');
require('dotenv').config();

console.log(`✅ MONGODB_URI loaded: ${process.env.MONGODB_URI ? 'YES' : 'NO'}`);
console.log(`✅ JWT_SECRET loaded: ${process.env.JWT_SECRET ? 'YES' : 'NO'}`);
console.log(`✅ PORT loaded: ${process.env.PORT ? 'YES' : 'NO'}`);

if (process.env.MONGODB_URI) {
    // Mask the password
    const maskedUri = process.env.MONGODB_URI.replace(/:([^:@]+)@/, ':***@');
    console.log(`🔗 MONGODB_URI: ${maskedUri}`);
} else {
    console.log('❌ MONGODB_URI is undefined');
    console.log('\n🔍 All environment variables:');
    Object.keys(process.env).filter(key => key.includes('MONGO') || key.includes('PSN')).forEach(key => {
        console.log(`   ${key}: ${process.env[key]}`);
    });
}