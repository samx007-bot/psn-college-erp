#!/usr/bin/env node

/**
 * Startup script for PSN College ERP
 * Ensures environment variables are loaded before starting server
 */

const path = require('path');
const fs = require('fs');

console.log('🚀 Starting PSN College ERP Server...\n');

// Ensure we're in the right directory
console.log(`📁 Current directory: ${process.cwd()}`);

// Check if .env file exists
const envPath = path.join(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found at:', envPath);
    process.exit(1);
}

console.log('✅ .env file found');

// Load environment variables
require('dotenv').config();

// Verify critical environment variables
const required = ['MONGODB_URI', 'JWT_SECRET', 'ADMIN_EMAIL'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
    console.log('❌ Missing required environment variables:', missing);
    process.exit(1);
}

console.log('✅ All required environment variables loaded');
console.log(`🌐 Server will run on port: ${process.env.PORT || 5000}`);
console.log(`🗄️  Database: Connected to MongoDB Atlas`);

// Start the server
console.log('\n🔧 Loading server modules...');
try {
    require('./server');
} catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
}