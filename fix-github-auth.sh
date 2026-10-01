#!/bin/bash

echo "🔧 Fixing GitHub Authentication for PSN College ERP"
echo ""

# Check current remote
echo "🔍 Current GitHub remote:"
git remote -v
echo ""

# Option 1: Use Personal Access Token URL
echo "📝 Method 1: Using Personal Access Token"
echo "1. Go to: https://github.com/settings/tokens"
echo "2. Click 'Generate new token (classic)'"
echo "3. Select 'repo' scope"
echo "4. Copy the token"
echo "5. Run this command (replace TOKEN with your actual token):"
echo ""
echo "git remote set-url origin https://TOKEN@github.com/samx007-bot/psn-college-erp.git"
echo ""

# Option 2: Use username and token
echo "📝 Method 2: Push with credentials"
echo "Run this command:"
echo "git push https://samx007-bot:TOKEN@github.com/samx007-bot/psn-college-erp.git main"
echo ""

# Option 3: SSH (if SSH key is set up)
echo "📝 Method 3: Using SSH (if you have SSH key)"
echo "git remote set-url origin git@github.com:samx007-bot/psn-college-erp.git"
echo ""

echo "🔑 Get your Personal Access Token at:"
echo "https://github.com/settings/tokens"
echo ""
echo "⚠️  Important: Use the token as password when prompted!"