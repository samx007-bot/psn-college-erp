#!/bin/bash

# GitHub Upload Script for PSN College ERP
echo "🚀 Setting up GitHub repository for PSN College ERP"

# Check if user provided username
if [ -z "$1" ]; then
    echo "❌ Please provide your GitHub username:"
    echo "Usage: bash setup-github.sh your-github-username"
    echo ""
    echo "Example: bash setup-github.sh samx007-bot"
    echo "Example: bash setup-github.sh john-doe"
    exit 1
fi

GITHUB_USERNAME=$1
REPO_NAME="psn-college-erp"
REPO_URL="https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"

echo "📋 Repository URL: $REPO_URL"
echo ""

# Remove existing remote if any
echo "🧹 Cleaning existing remotes..."
git remote remove origin 2>/dev/null

# Add remote origin
echo "🔗 Adding GitHub remote..."
git remote add origin "$REPO_URL"

if [ $? -eq 0 ]; then
    echo "✅ Remote added successfully"
    echo ""
    echo "� Verifying remote:"
    git remote -v
    echo ""
    echo "📤 Ready to push to GitHub!"
    echo "Run this command to upload your code:"
    echo ""
    echo "git push -u origin main"
    echo ""
    echo "📝 When prompted:"
    echo "Username: $GITHUB_USERNAME"
    echo "Password: [Use your Personal Access Token]"
    echo ""
    echo "🔑 Don't have a token? Get one at:"
    echo "https://github.com/settings/tokens"
else
    echo "❌ Failed to add remote"
fi