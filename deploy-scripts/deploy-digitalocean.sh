#!/bin/bash

# Deploy PSN College ERP to DigitalOcean App Platform
echo "🌊 Deploying PSN College ERP to DigitalOcean"

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo "❌ doctl is not installed"
    echo "📥 Install from: https://docs.digitalocean.com/reference/doctl/how-to/install/"
    exit 1
fi

# Login to DigitalOcean
echo "🔑 Please login to DigitalOcean..."
doctl auth init

# Copy app spec
cp deploy-configs/digitalocean-app.yaml ./app-spec.yaml

echo "📝 App specification created at ./app-spec.yaml"
echo "🔧 Please update the GitHub repository URL in app-spec.yaml if needed"
echo ""
echo "🌐 Deploy manually at: https://cloud.digitalocean.com/apps"
echo "   1. Click 'Create App'"
echo "   2. Choose 'Upload app spec' and use ./app-spec.yaml"
echo "   3. Add environment variables:"
echo "      - MONGODB_URI=your_mongodb_uri"
echo "      - JWT_SECRET=your_jwt_secret"
echo "   4. Deploy!"
echo ""
echo "💰 Cost: $5/month for Basic plan"