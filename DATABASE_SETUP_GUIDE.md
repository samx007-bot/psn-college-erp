# 🗄️ Database Setup Guide for PSN College ERP

## MongoDB Atlas Cloud Database Setup

### Step 1: Create MongoDB Atlas Account
1. **Visit**: [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. **Click**: "Try Free"
3. **Sign up** with email or use Google/GitHub login
4. **Verify** your email address

### Step 2: Create Free Cluster
1. **After login**: Click "Create a New Cluster"
2. **Choose**: "Shared" (Free tier)
3. **Select**: "M0 Sandbox" (Free forever - 512MB storage)
4. **Cloud Provider**: AWS (recommended)
5. **Region**: Choose closest to your location
6. **Cluster Name**: `psn-college-cluster`
7. **Click**: "Create Cluster" (takes 1-3 minutes)

### Step 3: Database Security Setup

#### Create Database User
1. **Navigate**: Database Access (left sidebar)
2. **Click**: "Add New Database User"
3. **Authentication**: Password
4. **Username**: `psn_admin`
5. **Password**: Generate secure password (SAVE THIS!)
6. **Privileges**: "Built-in Role" → "Read and write to any database"
7. **Click**: "Add User"

#### Configure Network Access
1. **Navigate**: Network Access (left sidebar)
2. **Click**: "Add IP Address"
3. **Choose**: "Allow Access from Anywhere" (0.0.0.0/0)
   - This allows your deployed app to connect from any hosting platform
4. **Click**: "Confirm"

### Step 4: Get Connection String
1. **Go to**: Clusters
2. **Click**: "Connect" button on your cluster
3. **Choose**: "Connect your application"
4. **Select**: Node.js driver, version 4.1+
5. **Copy** the connection string:
   ```
   mongodb+srv://psn_admin:<password>@psn-college-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### Step 5: Configure Environment Variables

#### For Local Development (.env)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://psn_admin:YOUR_PASSWORD@psn-college-cluster.xxxxx.mongodb.net/psn_college_erp?retryWrites=true&w=majority
JWT_SECRET=your_super_secure_jwt_secret_minimum_32_characters_long
JWT_EXPIRE=7d
ADMIN_EMAIL=admin@psn.edu.in
ADMIN_PASSWORD=SecurePassword123!
COLLEGE_NAME=PSN Engineering College
COLLEGE_CODE=PSN
BCRYPT_ROUNDS=12
```

#### For Production (.env.production)
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://psn_admin:YOUR_PASSWORD@psn-college-cluster.xxxxx.mongodb.net/psn_college_erp?retryWrites=true&w=majority
JWT_SECRET=your_production_jwt_secret_different_from_dev
JWT_EXPIRE=7d
ADMIN_EMAIL=admin@psn.edu.in
ADMIN_PASSWORD=SecurePassword123!
COLLEGE_NAME=PSN Engineering College
COLLEGE_CODE=PSN
BCRYPT_ROUNDS=12
```

**Important**: Replace `YOUR_PASSWORD` with the actual password you created for the database user!

### Step 6: Initialize Database with Sample Data

Run the database setup script to create initial data:

```bash
# Make sure you have the correct MONGODB_URI in your .env file
node database-setup.js
```

This will create:
- ✅ Academic year (2024-2025)
- ✅ 5 Engineering departments (CSE, ECE, MECH, CIVIL, EEE)
- ✅ Sample subjects for CSE department
- ✅ Default admin user

### Step 7: Test Database Connection

Create a simple test script:

```javascript
// test-db-connection.js
const mongoose = require('mongoose');
require('dotenv').config();

const testConnection = async () => {
    try {
        console.log('Testing MongoDB connection...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Successfully connected to MongoDB Atlas!');
        
        // List databases
        const admin = mongoose.connection.db.admin();
        const result = await admin.listDatabases();
        console.log('📋 Available databases:', result.databases.map(db => db.name));
        
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
    } finally {
        mongoose.connection.close();
    }
};

testConnection();
```

Run with: `node test-db-connection.js`

## Deployment Platform Configuration

### Railway
1. **Environment Variables** → Add:
   - `MONGODB_URI`: Your Atlas connection string
   - `JWT_SECRET`: Your secure JWT secret
   - `NODE_ENV`: production

### Render
1. **Environment** tab → Add:
   - `MONGODB_URI`: Your Atlas connection string
   - `JWT_SECRET`: Your secure JWT secret
   - `NODE_ENV`: production

### Vercel
1. **Settings** → **Environment Variables**:
   - `MONGODB_URI`: Your Atlas connection string
   - `JWT_SECRET`: Your secure JWT secret
   - `NODE_ENV`: production

## Database Schema Overview

Your PSN College ERP uses these collections:

### Users Collection
- **Admins**: Full system access
- **Faculty**: Teaching staff with grading/attendance permissions  
- **Students**: Enrolled students with limited access

### Academic Collections
- **Departments**: Engineering departments (CSE, ECE, etc.)
- **Subjects**: Courses offered by each department
- **AcademicYears**: Academic session management

### Operational Collections
- **Attendance**: Daily attendance records
- **Grades**: Student grades and assessments
- **Leaves**: Leave applications and approvals

## Security Best Practices

1. **Strong Passwords**: Use complex passwords for database users
2. **Environment Variables**: Never commit database URLs to code
3. **Network Security**: Restrict IP access in production
4. **Regular Backups**: Atlas provides automatic backups
5. **Monitoring**: Enable Atlas monitoring and alerts

## Troubleshooting

### Common Issues

**Connection Timeout**:
```
MongoNetworkTimeoutError: Server selection timed out
```
- Check network access settings
- Verify IP whitelist includes your deployment platform

**Authentication Failed**:
```
MongoServerError: Authentication failed
```
- Verify username/password in connection string
- Check database user permissions

**Database Not Found**:
- Database is created automatically on first document insert
- Run the initialization script to populate data

### Getting Help

1. **MongoDB Atlas Support**: [https://docs.atlas.mongodb.com/](https://docs.atlas.mongodb.com/)
2. **Connection Issues**: Check Atlas network access and user permissions
3. **Application Logs**: Check your hosting platform logs for specific error messages

## 🎉 Success Checklist

- ✅ MongoDB Atlas cluster created and running
- ✅ Database user created with proper permissions
- ✅ Network access configured (0.0.0.0/0 for deployment)
- ✅ Connection string obtained and tested
- ✅ Environment variables configured
- ✅ Sample data initialized
- ✅ Application connects successfully

Your PSN College ERP database is now ready for production use! 🚀