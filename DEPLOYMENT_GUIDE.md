# 🚀 PSN College ERP Deployment Guide

Follow this step-by-step guide to deploy your ERP application to the cloud.

## Prerequisites
- Git installed on your computer
- GitHub account (free)
- Email address for MongoDB Atlas

## Step 1: Setup MongoDB Atlas (Free Cloud Database)

### 1.1 Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Click "Try Free" and create an account
3. Verify your email address

### 1.2 Create a Free Cluster
1. After logging in, click "Create a New Cluster"
2. Choose **"Shared"** for the free tier
3. Select **"M0 Sandbox"** (Free forever)
4. Choose your preferred cloud provider and region (AWS recommended)
5. Name your cluster (e.g., "psn-college-erp")
6. Click "Create Cluster" (takes 1-3 minutes)

### 1.3 Configure Database Access
1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Create a username and password (save these!)
5. Select "Built-in Role" → "Read and write to any database"
6. Click "Add User"

### 1.4 Configure Network Access
1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (for now)
4. Click "Confirm"

### 1.5 Get Connection String
1. Go to "Clusters" and click "Connect" on your cluster
2. Choose "Connect your application"
3. Select "Node.js" and version "4.1 or later"
4. Copy the connection string (looks like):
   ```
   mongodb+srv://username:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

## Step 2: Prepare Your Code for Deployment

### 2.1 Update Environment Variables
Create a `.env.production` file with your production settings:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/psn_college_erp?retryWrites=true&w=majority
JWT_SECRET=your_super_secure_jwt_secret_minimum_32_characters_long
JWT_EXPIRE=7d
ADMIN_EMAIL=admin@psn.edu.in
ADMIN_PASSWORD=SecurePassword123!
COLLEGE_NAME=PSN Engineering College
COLLEGE_CODE=PSN
BCRYPT_ROUNDS=12
```

**Important:** Replace the MongoDB URI with your actual connection string from Step 1.5!

### 2.2 Push to GitHub
1. Initialize git repository (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit - PSN College ERP"
   ```

2. Create a new repository on GitHub
3. Connect your local repo to GitHub:
   ```bash
   git remote add origin https://github.com/yourusername/psn-college-erp.git
   git branch -M main
   git push -u origin main
   ```

## Step 3: Deploy to Railway (Recommended)

### 3.1 Deploy with Railway
1. Go to [Railway](https://railway.app/)
2. Sign up with your GitHub account
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your PSN College ERP repository
5. Railway will automatically detect it's a Node.js app

### 3.2 Configure Environment Variables
1. In your Railway project, go to "Variables" tab
2. Add these environment variables:
   ```
   NODE_ENV=production
   MONGODB_URI=your_atlas_connection_string
   JWT_SECRET=your_secure_jwt_secret
   ADMIN_EMAIL=admin@psn.edu.in
   ADMIN_PASSWORD=SecurePassword123!
   COLLEGE_NAME=PSN Engineering College
   COLLEGE_CODE=PSN
   ```

### 3.3 Deploy
1. Railway will automatically deploy your app
2. You'll get a URL like: `https://psn-college-erp-production.up.railway.app`
3. The deployment takes 2-5 minutes

## Step 4: Alternative - Deploy to Render

### 4.1 Deploy with Render
1. Go to [Render](https://render.com/)
2. Sign up with your GitHub account
3. Click "New" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: psn-college-erp
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 4.2 Add Environment Variables
Add the same environment variables as in Railway

## Step 5: Alternative - Deploy to Heroku

### 5.1 Deploy with Heroku
1. Install [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
2. Login to Heroku: `heroku login`
3. Create app: `heroku create psn-college-erp`
4. Set environment variables:
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set MONGODB_URI="your_atlas_connection_string"
   heroku config:set JWT_SECRET="your_secure_jwt_secret"
   heroku config:set ADMIN_EMAIL="admin@psn.edu.in"
   heroku config:set ADMIN_PASSWORD="SecurePassword123!"
   ```
5. Deploy: `git push heroku main`

## Step 6: Test Your Deployment

### 6.1 Access Your Application
1. Open your deployment URL
2. You should see a success message or API response
3. Test the health endpoint: `https://your-app.com/api/health`

### 6.2 Create Default Admin
Your app will automatically create the default admin account on first startup.

### 6.3 Test API Endpoints
Test key endpoints:
- `GET /api/health` - Health check
- `POST /api/auth/login` - Login with admin credentials
- `GET /api/admin/dashboard` - Admin dashboard (requires token)

## Step 7: Post-Deployment Setup

### 7.1 Security Considerations
1. Change default admin password immediately
2. Update CORS origins in production
3. Set up proper error monitoring
4. Configure database backups

### 7.2 Custom Domain (Optional)
1. Purchase a domain
2. Configure DNS settings in your hosting platform
3. Set up SSL certificate (usually automatic)

### 7.3 Monitoring
1. Set up application monitoring
2. Configure database alerts in MongoDB Atlas
3. Set up log monitoring

## 🎉 Congratulations!

Your PSN College ERP system is now live! Here's what you can do:

### Default Access:
- **Admin Login**: admin@psn.edu.in / SecurePassword123!
- **API Base URL**: https://your-app-url.com/api

### Next Steps:
1. Login as admin and change password
2. Create departments and subjects
3. Add faculty members
4. Bulk import students
5. Start using the system!

## 🆘 Troubleshooting

### Common Issues:

**App won't start:**
- Check MongoDB connection string
- Verify all environment variables are set
- Check application logs

**Database connection failed:**
- Verify MongoDB Atlas network access
- Check connection string format
- Ensure database user has correct permissions

**API returns 500 errors:**
- Check application logs
- Verify JWT secret is set
- Test database connectivity

### Getting Help:
1. Check the application logs in your hosting platform
2. Test locally first: `npm start`
3. Verify environment variables match your production settings

## 📱 Testing Your Live Application

Use these curl commands to test your deployment:

```bash
# Health check
curl https://your-app-url.com/api/health

# Login as admin
curl -X POST https://your-app-url.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@psn.edu.in","password":"SecurePassword123!"}'

# Get admin dashboard (use token from login response)
curl https://your-app-url.com/api/admin/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Your ERP system is now ready for production use! 🎊