#!/usr/bin/env node

/**
 * Quick deployment checker and guide for PSN College ERP
 * Run with: node deploy.js
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 PSN College ERP Deployment Checker\n');

// Check if required files exist
const requiredFiles = [
  'package.json',
  'server.js',
  'Procfile',
  '.env.example'
];

const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));

if (missingFiles.length > 0) {
  console.log('❌ Missing required files:');
  missingFiles.forEach(file => console.log(`   - ${file}`));
  process.exit(1);
}

console.log('✅ All required files present\n');

// Check package.json for required scripts
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const requiredScripts = ['start'];
const missingScripts = requiredScripts.filter(script => !packageJson.scripts?.[script]);

if (missingScripts.length > 0) {
  console.log('❌ Missing required npm scripts:');
  missingScripts.forEach(script => console.log(`   - ${script}`));
  process.exit(1);
}

console.log('✅ Required npm scripts present\n');

// Check for production environment file
if (!fs.existsSync('.env.production')) {
  console.log('⚠️  No .env.production file found');
  console.log('   Create one with your production environment variables');
} else {
  console.log('✅ Production environment file found\n');
}

// Display deployment options
console.log('🌐 Your deployment options:\n');

console.log('1. 🚄 Railway (Recommended - Free)');
console.log('   • Go to https://railway.app/');
console.log('   • Connect your GitHub repository');
console.log('   • Set environment variables');
console.log('   • Deploy automatically\n');

console.log('2. 🎨 Render (Free tier available)');
console.log('   • Go to https://render.com/');
console.log('   • Create new Web Service from GitHub');
console.log('   • Use: Build: npm install, Start: npm start\n');

console.log('3. 💜 Heroku (Free tier discontinued, paid plans available)');
console.log('   • Install Heroku CLI');
console.log('   • heroku create your-app-name');
console.log('   • git push heroku main\n');

console.log('4. 🌊 DigitalOcean App Platform');
console.log('   • Go to https://cloud.digitalocean.com/apps');
console.log('   • Create app from GitHub repository\n');

// MongoDB Atlas reminder
console.log('📋 Don\'t forget:');
console.log('   1. Set up MongoDB Atlas (free tier)');
console.log('   2. Get your connection string');
console.log('   3. Set environment variables in your hosting platform');
console.log('   4. Update MONGODB_URI with your Atlas connection string');
console.log('   5. Test your deployment!\n');

console.log('📖 For detailed instructions, see DEPLOYMENT_GUIDE.md\n');

// Environment variables checklist
console.log('🔧 Required Environment Variables:');
console.log('   • NODE_ENV=production');
console.log('   • MONGODB_URI=your_atlas_connection_string');
console.log('   • JWT_SECRET=your_secure_secret');
console.log('   • ADMIN_EMAIL=admin@psn.edu.in');
console.log('   • ADMIN_PASSWORD=secure_password\n');

console.log('✨ Your PSN College ERP is ready for deployment!');
console.log('🎯 Choose a platform above and follow the DEPLOYMENT_GUIDE.md');

// Check if git is initialized
if (!fs.existsSync('.git')) {
  console.log('\n⚠️  Git not initialized. Run:');
  console.log('   git init');
  console.log('   git add .');
  console.log('   git commit -m "Initial commit"');
  console.log('   # Then push to GitHub');
}