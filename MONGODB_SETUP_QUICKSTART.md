# 🗄️ MongoDB Atlas Setup - Quick Fix Guide

## Problem: "authentication failed"

This means either:
1. Your database password is incorrect
2. The database user doesn't exist
3. The password has special characters that need encoding

## ✅ Quick Solution Steps

### Step 1: Reset Your MongoDB Atlas Password

1. **Go to [MongoDB Atlas](https://cloud.mongodb.com/)**
2. **Sign in to your account**
3. **Click "Database Access"** in the left sidebar
4. **Find your user** (psn_admin)
5. **Click "Edit"** button
6. **Choose "Edit Password"**
7. **Set a NEW simple password** (for testing):
   - Example: `SimplePass123`
   - **Important**: Avoid special characters like `@`, `$`, `#`, `:`, `/` for now
8. **Click "Update User"**

### Step 2: Get the Correct Connection String

1. **Go to "Database"** in the left sidebar
2. **Click "Connect"** on your cluster
3. **Choose "Connect your application"**
4. **Copy the connection string**
5. **Replace `<password>` with your actual password**

**Example:**
```
mongodb+srv://psn_admin:SimplePass123@psn-college-cluster.6ntxbjy.mongodb.net/psn_college_erp?retryWrites=true&w=majority
```

### Step 3: Update Your .env File

Open `.env` file and update the `MONGODB_URI` line:

```env
MONGODB_URI=mongodb+srv://psn_admin:SimplePass123@psn-college-cluster.6ntxbjy.mongodb.net/psn_college_erp?retryWrites=true&w=majority
```

**Replace `SimplePass123` with your actual password!**

### Step 4: Test the Connection

```bash
node test-database.js
```

If you see "✅ Successfully connected to MongoDB Atlas!" - you're done!

## 🚨 Common Issues

### Issue 1: Special Characters in Password

If your password has special characters, you need to URL encode them:

| Character | Encoded |
|-----------|---------|
| @ | %40 |
| : | %3A |
| / | %2F |
| ? | %3F |
| # | %23 |
| [ | %5B |
| ] | %5D |
| % | %25 |

**Example:**
- Password: `Pass@123#`
- Encoded: `Pass%40123%23`

### Issue 2: Network Access Not Configured

1. Go to "Network Access" in MongoDB Atlas
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (0.0.0.0/0)
4. Click "Confirm"

### Issue 3: Database User Doesn't Exist

1. Go to "Database Access"
2. Click "Add New Database User"
3. Username: `psn_admin`
4. Password: Choose a password (save it!)
5. Database User Privileges: "Read and write to any database"
6. Click "Add User"

## 🎯 Recommended Setup for Testing

**Create a NEW user with a simple password:**

1. **Username**: `psnerp`
2. **Password**: `PsnCollege2024` (no special characters)
3. **Privileges**: Read and write to any database
4. **Connection String**:
```
mongodb+srv://psnerp:PsnCollege2024@psn-college-cluster.6ntxbjy.mongodb.net/psn_college_erp?retryWrites=true&w=majority
```

## ✅ After You Fix Authentication

Once connected successfully, run:

```bash
# Initialize database with sample data
node database-setup.js
```

This will create:
- 5 Engineering departments
- Sample subjects
- Academic year
- Default admin user

## 🚀 Then Deploy!

Once your local database connection works, deploy to Railway with the same connection string!

## 💡 Pro Tip

For production, use a strong password with special characters, but remember to URL encode them in your connection string!