# ⚡ Quick Deploy Guide - PSN College ERP

Choose your preferred hosting platform and follow the steps:

## 🚄 Railway (Recommended - Easiest)

### 1-Click Deploy
1. **Go to:** https://railway.app/
2. **Sign up** with GitHub
3. **Click:** "New Project" → "Deploy from GitHub repo"
4. **Select:** `samx007-bot/psn-college-erp`
5. **Add Environment Variables:**
   ```
   NODE_ENV=production
   MONGODB_URI=your_mongodb_atlas_uri
   JWT_SECRET=your_jwt_secret
   ADMIN_EMAIL=admin@psn.edu.in
   ADMIN_PASSWORD=SecurePassword123!
   ```
6. **Deploy!** ✅

**Cost:** $5/month credit (covers development)

---

## 🎨 Render (Free Tier)

### Simple Deploy
1. **Go to:** https://render.com/
2. **Sign up** with GitHub
3. **Click:** "New" → "Web Service"
4. **Connect:** Your GitHub repository
5. **Configure:**
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
6. **Add Environment Variables:** (same as above)
7. **Deploy!** ✅

**Cost:** Free (750 hours/month)

---

## ✈️ Fly.io (Global Edge)

### CLI Deploy
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Run deployment script
chmod +x deploy-scripts/deploy-flyio.sh
./deploy-scripts/deploy-flyio.sh
```

**Cost:** ~$2/month (256MB RAM)

---

## 🌊 DigitalOcean App Platform (Production)

### Managed Deploy
1. **Go to:** https://cloud.digitalocean.com/apps
2. **Click:** "Create App"
3. **Choose:** "GitHub" → Select repository
4. **Configure:**
   - **Build:** `npm install`
   - **Run:** `npm start`
   - **Plan:** Basic ($5/month)
5. **Add Environment Variables**
6. **Deploy!** ✅

**Cost:** $5/month (predictable)

---

## 🏠 VPS Hosting (Advanced)

### Hetzner VPS (Best Value)
```bash
# 1. Create server at https://console.hetzner.com/
# 2. Choose: Ubuntu 22.04, CX22 (4GB RAM, €4.51/month)
# 3. SSH to server and run:

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Clone and setup your app
git clone https://github.com/samx007-bot/psn-college-erp.git
cd psn-college-erp
npm install
cp .env.example .env
# Edit .env with your values

# Install PM2 for process management
sudo npm install -g pm2
pm2 start start-server.js --name "psn-erp"
pm2 startup
pm2 save

# Install nginx for reverse proxy
sudo apt install nginx
# Configure nginx to proxy port 3001
```

**Cost:** €4.51/month (~$5) - 4GB RAM!

---

## 🎯 Which One Should You Choose?

### **For Development/Testing:**
→ **Render** (free tier)

### **For Quick Production:**
→ **Railway** ($5 credit, easiest)

### **For Serious Production:**
→ **DigitalOcean App Platform** ($5/month, reliable)

### **For Maximum Value:**
→ **Hetzner VPS** (~$5/month, 4GB RAM, self-managed)

### **For Global Performance:**
→ **Fly.io** (~$2/month, edge deployment)

---

## 🔧 Environment Variables Needed

All platforms need these environment variables:

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/psn_college_erp
JWT_SECRET=your_super_secure_jwt_secret_32_characters_minimum
ADMIN_EMAIL=admin@psn.edu.in
ADMIN_PASSWORD=SecurePassword123!
COLLEGE_NAME=PSN Engineering College
COLLEGE_CODE=PSN
```

---

## 🗄️ MongoDB Atlas Setup

**Required for all platforms:**

1. **Go to:** https://cloud.mongodb.com/
2. **Create:** Free M0 cluster
3. **Add:** Database user and network access (0.0.0.0/0)
4. **Get:** Connection string
5. **Use:** As MONGODB_URI in your hosting platform

---

## ✅ After Deployment

1. **Test:** `https://your-app-url/api/health`
2. **Login:** `https://your-app-url/api/auth/login`
3. **Use credentials:** admin@psn.edu.in / SecurePassword123!
4. **Change password** after first login

**Your PSN College ERP is live! 🎉**