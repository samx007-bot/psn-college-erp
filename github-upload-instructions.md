# 📤 GitHub Upload Instructions for PSN College ERP

## Quick Steps (Copy & Paste Commands)

### 1. After creating your GitHub repository, run these commands:

```bash
# Navigate to your project folder (if not already there)
cd "/Users/apple/Desktop/Psn Application "

# Add your GitHub repository as remote origin
# REPLACE 'yourusername' with your actual GitHub username!
git remote add origin https://github.com/yourusername/psn-college-erp.git

# Push your code to GitHub
git push -u origin main
```

### 2. If you get authentication errors, use Personal Access Token:

GitHub no longer accepts passwords. You need a Personal Access Token:

1. Go to GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name like "PSN ERP Upload"
4. Select scopes: "repo" (full control of private repositories)
5. Click "Generate token"
6. COPY THE TOKEN (you won't see it again!)

### 3. Use token when pushing:

```bash
# When prompted for password, use your Personal Access Token
git push -u origin main
# Username: yourgithubusername
# Password: your_personal_access_token_here
```

### Alternative: Use GitHub CLI (Easier)

Install GitHub CLI and authenticate:

```bash
# Install GitHub CLI (if not installed)
brew install gh

# Authenticate with GitHub
gh auth login

# Create repository and push (all in one)
gh repo create psn-college-erp --public --push --source=.
```

## Troubleshooting

### Problem: "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/yourusername/psn-college-erp.git
git push -u origin main
```

### Problem: "permission denied"
- Use Personal Access Token instead of password
- Or use SSH keys (more advanced)

### Problem: "repository not found"
- Check repository name spelling
- Ensure repository exists on GitHub
- Verify username in URL

## After Successful Upload

✅ Your code will be visible on GitHub
✅ You can now deploy to Railway, Render, or Heroku
✅ Share your repository with others
✅ Track changes with version control

## Next: Deploy to Cloud

Once uploaded to GitHub, follow these links to deploy:

- **Railway**: https://railway.app/ → New Project → Deploy from GitHub
- **Render**: https://render.com/ → New Web Service → Connect GitHub
- **Vercel**: https://vercel.com/ → Import Git Repository

Your PSN College ERP will be live in minutes! 🚀