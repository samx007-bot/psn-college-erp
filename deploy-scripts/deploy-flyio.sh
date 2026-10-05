#!/bin/bash

# Deploy PSN College ERP to Fly.io
echo "🚀 Deploying PSN College ERP to Fly.io"

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo "❌ flyctl is not installed"
    echo "📥 Install from: https://fly.io/docs/hands-on/install-flyctl/"
    exit 1
fi

# Login to Fly.io
echo "🔑 Please login to Fly.io..."
flyctl auth login

# Copy configuration
cp deploy-configs/fly.toml ./
cp deploy-configs/Dockerfile ./

# Create app (if not exists)
echo "📱 Creating Fly.io app..."
flyctl apps create psn-college-erp --org personal

# Set environment variables
echo "🔧 Setting environment variables..."
echo "Please enter your MongoDB URI:"
read -r MONGODB_URI
flyctl secrets set MONGODB_URI="$MONGODB_URI"

echo "Please enter your JWT Secret:"
read -r JWT_SECRET
flyctl secrets set JWT_SECRET="$JWT_SECRET"

flyctl secrets set ADMIN_EMAIL="admin@psn.edu.in"
flyctl secrets set ADMIN_PASSWORD="SecurePassword123!"
flyctl secrets set COLLEGE_NAME="PSN Engineering College"
flyctl secrets set COLLEGE_CODE="PSN"

# Deploy
echo "🚀 Deploying to Fly.io..."
flyctl deploy

echo "✅ Deployment complete!"
echo "🌐 Your app is available at: https://psn-college-erp.fly.dev/"