#!/usr/bin/env node

/**
 * Database Setup Script for PSN College ERP
 * This script initializes the database with sample data
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Department = require('./models/Department');
const Subject = require('./models/Subject');
const AcademicYear = require('./models/AcademicYear');

const setupDatabase = async () => {
    try {
        console.log('🗄️  Setting up PSN College ERP Database...\n');

        // Connect to MongoDB
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/psn_college_erp';
        console.log('📡 Connecting to MongoDB...');
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB\n');

        // Create Academic Year
        console.log('📅 Creating Academic Year...');
        const academicYear = new AcademicYear({
            year: '2024-2025',
            startDate: new Date('2024-06-01'),
            endDate: new Date('2025-03-31'),
            isActive: true
        });
        await academicYear.save();
        console.log('✅ Academic Year created');

        // Create Departments
        console.log('🏢 Creating Departments...');
        const departments = [
            {
                name: 'Computer Science Engineering',
                code: 'CSE',
                description: 'Computer Science and Engineering Department'
            },
            {
                name: 'Electronics and Communication Engineering',
                code: 'ECE',
                description: 'Electronics and Communication Engineering Department'
            },
            {
                name: 'Mechanical Engineering',
                code: 'MECH',
                description: 'Mechanical Engineering Department'
            },
            {
                name: 'Civil Engineering',
                code: 'CIVIL',
                description: 'Civil Engineering Department'
            },
            {
                name: 'Electrical and Electronics Engineering',
                code: 'EEE',
                description: 'Electrical and Electronics Engineering Department'
            }
        ];

        const createdDepartments = await Department.insertMany(departments);
        console.log(`✅ Created ${createdDepartments.length} departments`);

        // Create Subjects for CSE Department (as example)
        console.log('📚 Creating Subjects...');
        const cseId = createdDepartments.find(d => d.code === 'CSE')._id;
        
        const subjects = [
            {
                name: 'Data Structures and Algorithms',
                code: 'CS301',
                department: cseId,
                semester: 3,
                credits: {
                    theory: 3,
                    practical: 1
                },
                academicYear: academicYear._id
            },
            {
                name: 'Database Management Systems',
                code: 'CS302',
                department: cseId,
                semester: 3,
                credits: {
                    theory: 2,
                    practical: 1
                },
                academicYear: academicYear._id
            },
            {
                name: 'Computer Networks',
                code: 'CS401',
                department: cseId,
                semester: 4,
                credits: {
                    theory: 3,
                    practical: 1
                },
                academicYear: academicYear._id
            },
            {
                name: 'Software Engineering',
                code: 'CS402',
                department: cseId,
                semester: 4,
                credits: {
                    theory: 2,
                    practical: 1
                },
                academicYear: academicYear._id
            },
            {
                name: 'Web Technologies',
                code: 'CS501',
                department: cseId,
                semester: 5,
                credits: {
                    theory: 2,
                    practical: 1
                },
                academicYear: academicYear._id
            }
        ];

        const createdSubjects = await Subject.insertMany(subjects);
        console.log(`✅ Created ${createdSubjects.length} subjects`);

        // Create Default Admin User (if not exists)
        console.log('👤 Creating Admin User...');
        const bcrypt = require('bcrypt');
        
        const existingAdmin = await User.findOne({ email: 'admin@psn.edu.in' });
        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash('SecurePassword123!', 12);
            
            const adminUser = new User({
                firstName: 'System',
                lastName: 'Administrator',
                email: 'admin@psn.edu.in',
                password: hashedPassword,
                role: 'admin',
                isActive: true,
                profile: {
                    employeeId: 'PSN001',
                    contactNumber: '+91-9876543210',
                    address: 'PSN Engineering College, Chennai'
                }
            });
            
            await adminUser.save();
            console.log('✅ Admin user created');
        } else {
            console.log('✅ Admin user already exists');
        }

        console.log('\n🎉 Database setup completed successfully!');
        console.log('\n📋 Summary:');
        console.log(`   • Academic Year: ${academicYear.year}`);
        console.log(`   • Departments: ${createdDepartments.length}`);
        console.log(`   • Subjects: ${createdSubjects.length}`);
        console.log(`   • Admin User: admin@psn.edu.in`);
        
        console.log('\n🔑 Login Credentials:');
        console.log('   Email: admin@psn.edu.in');
        console.log('   Password: SecurePassword123!');
        
        console.log('\n🚀 Your PSN College ERP database is ready!');
        
    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
    } finally {
        mongoose.connection.close();
    }
};

// Run setup if called directly
if (require.main === module) {
    setupDatabase();
}

module.exports = setupDatabase;