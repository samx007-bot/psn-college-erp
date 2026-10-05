require('dotenv').config();

console.log('🔧 Testing Environment Loading...');
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);

if (!process.env.MONGODB_URI) {
    console.log('❌ MONGODB_URI is not defined');
    console.log('Available env vars starting with M:', Object.keys(process.env).filter(k => k.startsWith('M')));
    process.exit(1);
}

console.log('✅ MONGODB_URI is defined');

try {
    const connectDB = require('./config/database');
    console.log('✅ Database config loaded successfully');
    
    // Try to connect
    connectDB().then(() => {
        console.log('✅ Database connection successful');
        process.exit(0);
    }).catch(err => {
        console.log('❌ Database connection failed:', err.message);
        process.exit(1);
    });
} catch (error) {
    console.log('❌ Error loading database config:', error.message);
    process.exit(1);
}