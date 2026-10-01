#!/usr/bin/env node

/**
 * Database Connection Test for PSN College ERP
 * Run this to verify your MongoDB Atlas connection
 */

const mongoose = require('mongoose');
require('dotenv').config();

const testDatabase = async () => {
    try {
        console.log('🔧 Testing PSN College ERP Database Connection...\n');

        // Check if MONGODB_URI is set
        const mongoURI = process.env.MONGODB_URI;
        if (!mongoURI) {
            console.error('❌ MONGODB_URI not found in environment variables');
            console.log('💡 Make sure you have a .env file with MONGODB_URI set');
            process.exit(1);
        }

        console.log('📡 Connecting to MongoDB Atlas...');
        console.log(`🔗 URI: ${mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);

        // Connect with timeout
        await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
        });

        console.log('✅ Successfully connected to MongoDB Atlas!\n');

        // Test database operations
        console.log('🧪 Testing database operations...');

        // List databases
        const admin = mongoose.connection.db.admin();
        const result = await admin.listDatabases();
        console.log('📋 Available databases:');
        result.databases.forEach(db => {
            console.log(`   • ${db.name} (${Math.round(db.sizeOnDisk / 1024)} KB)`);
        });

        // Check collections in current database
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('\n📚 Collections in current database:');
        if (collections.length > 0) {
            collections.forEach(collection => {
                console.log(`   • ${collection.name}`);
            });
        } else {
            console.log('   • No collections found (database is empty)');
            console.log('   💡 Run "node database-setup.js" to initialize with sample data');
        }

        // Test write operation
        console.log('\n✍️  Testing write operation...');
        const testCollection = mongoose.connection.db.collection('connection_test');
        await testCollection.insertOne({
            message: 'PSN College ERP Database Test',
            timestamp: new Date(),
            status: 'success'
        });
        console.log('✅ Write operation successful');

        // Test read operation
        console.log('📖 Testing read operation...');
        const testDoc = await testCollection.findOne({ message: 'PSN College ERP Database Test' });
        if (testDoc) {
            console.log('✅ Read operation successful');
            console.log(`   📅 Test document created at: ${testDoc.timestamp}`);
        }

        // Cleanup test document
        await testCollection.deleteOne({ message: 'PSN College ERP Database Test' });
        console.log('🧹 Test document cleaned up');

        console.log('\n🎉 Database connection test completed successfully!');
        console.log('\n📋 Connection Summary:');
        console.log('   ✅ Connection established');
        console.log('   ✅ Read operations working');
        console.log('   ✅ Write operations working');
        console.log('   ✅ Database permissions valid');

        console.log('\n🚀 Your PSN College ERP is ready to connect to the database!');

    } catch (error) {
        console.error('\n❌ Database connection test failed:');
        console.error(`   Error: ${error.message}`);
        
        if (error.message.includes('Authentication failed')) {
            console.log('\n💡 Authentication Tips:');
            console.log('   • Check username and password in MONGODB_URI');
            console.log('   • Ensure database user exists in MongoDB Atlas');
            console.log('   • Verify user has read/write permissions');
        }
        
        if (error.message.includes('Server selection timed out')) {
            console.log('\n💡 Network Tips:');
            console.log('   • Check network access settings in MongoDB Atlas');
            console.log('   • Ensure IP address 0.0.0.0/0 is whitelisted');
            console.log('   • Try connecting from a different network');
        }
        
        if (error.message.includes('ENOTFOUND')) {
            console.log('\n💡 DNS Tips:');
            console.log('   • Check cluster hostname in connection string');
            console.log('   • Ensure cluster is running in MongoDB Atlas');
        }

        process.exit(1);
    } finally {
        mongoose.connection.close();
    }
};

// Run test if called directly
if (require.main === module) {
    testDatabase();
}

module.exports = testDatabase;