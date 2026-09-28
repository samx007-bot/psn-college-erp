const { User } = require('../models');

const createDefaultAdmin = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      return;
    }

    // Generate admin user ID
    const adminUserId = await User.generateUserId('admin');

    // Create default admin
    const defaultAdmin = new User({
      userId: adminUserId,
      email: process.env.ADMIN_EMAIL || 'admin@psn.edu.in',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      firstName: 'System',
      lastName: 'Administrator',
      role: 'admin',
      phone: '9876543210',
      isActive: true,
      isEmailVerified: true,
      address: {
        street: 'PSN Engineering College Campus',
        city: 'Tirunelveli',
        state: 'Tamil Nadu',
        zipCode: '627012',
        country: 'India'
      }
    });

    await defaultAdmin.save();
    
    console.log('Default admin created successfully:');
    console.log('Email:', defaultAdmin.email);
    console.log('User ID:', defaultAdmin.userId);
    console.log('Password:', process.env.ADMIN_PASSWORD || 'admin123');
    console.log('Please change the default password after first login!');
    
  } catch (error) {
    console.error('Error creating default admin:', error.message);
  }
};

module.exports = createDefaultAdmin;