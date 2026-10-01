# 🔑 Fix "Authentication Failed" Error

## Current Problem

Your `.env` file has:
```
MONGODB_URI=mongodb+srv://psn_admin:REPLACE_WITH_YOUR_ACTUAL_PASSWORD@...
```

You need to replace `REPLACE_WITH_YOUR_ACTUAL_PASSWORD` with your real MongoDB password!

## 🎯 Quick Fix (3 Steps)

### Step 1: Get/Reset Your MongoDB Password

**Option A: If you remember your password**
- Just use that password in Step 3

**Option B: Reset password (Recommended)**
1. Go to **https://cloud.mongodb.com/**
2. Sign in
3. Click **"Database Access"** (left sidebar)
4. Find user **"psn_admin"**
5. Click **"Edit"** button
6. Click **"Edit Password"**
7. Set new password: `PsnCollege2024` (simple, no special chars)
8. Click **"Update User"**

### Step 2: Update .env File

Open your `.env` file and change this line:

**FROM:**
```
MONGODB_URI=mongodb+srv://psn_admin:REPLACE_WITH_YOUR_ACTUAL_PASSWORD@psn-college-cluster.6ntxbjy.mongodb.net/psn_college_erp?retryWrites=true&w=majority
```

**TO:** (using your actual password)
```
MONGODB_URI=mongodb+srv://psn_admin:PsnCollege2024@psn-college-cluster.6ntxbjy.mongodb.net/psn_college_erp?retryWrites=true&w=majority
```

### Step 3: Test Connection

```bash
node test-mongo-connection.js
```

You should see:
```
✅ SUCCESS! Connected to MongoDB Atlas!
```

## 🆘 Still Not Working?

### Check Network Access

1. Go to MongoDB Atlas
2. Click **"Network Access"** (left sidebar)
3. Check if **0.0.0.0/0** is in the list
4. If not, click **"Add IP Address"** → **"Allow Access from Anywhere"** → **"Confirm"**

### Check Database User Exists

1. Go to **"Database Access"**
2. Make sure user **"psn_admin"** exists
3. If not, create it:
   - Username: `psn_admin`
   - Password: `PsnCollege2024`
   - Role: "Read and write to any database"

### Special Characters in Password?

If your password has special characters like `@`, `#`, `$`, etc., you need to URL encode them:

**Example:**
- Password: `Pass@123`
- Encoded: `Pass%40123`

Use this tool: https://www.urlencoder.org/

## ✅ After Connection Works

Run this to initialize your database:
```bash
node database-setup.js
```

This creates:
- Departments (CSE, ECE, MECH, CIVIL, EEE)
- Sample subjects
- Academic year 2024-2025
- Default admin user (admin@psn.edu.in / SecurePassword123!)

## 🚀 Then Deploy to Railway

Once working locally, deploy to Railway with the same connection string!

---

**Need more help?** Share the exact error message you're seeing.