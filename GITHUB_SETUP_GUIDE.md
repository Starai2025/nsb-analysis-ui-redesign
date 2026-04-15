# GitHub Repository Setup Guide

## 🚨 SECURITY WARNING
Your `.env` file contains an Anthropic API key that was exposed. **You must rotate this key immediately!**

Go to: https://console.anthropic.com/settings/keys and create a new key, then delete the old one.

---

## Quick Start (Recommended)

**Double-click: `SETUP_GITHUB.bat`**

This will:
1. ✅ Initialize git repository
2. ✅ Create comprehensive .gitignore (protects your .env file)
3. ✅ Create README.md
4. ✅ Commit all files
5. ✅ Open GitHub in your browser to create the repo
6. ✅ Push everything to GitHub

---

## Alternative Scripts

### 1. `create-and-push.bat`
- Interactive script that guides you through each step
- Opens browser to create repository with pre-filled details
- Prompts you to paste repository URL
- Handles git setup and push

### 2. `push-to-github.bat`
- Basic git setup script
- Provides manual instructions for creating GitHub repo
- Good if you want more control over the process

---

## Manual Instructions (If you prefer doing it manually)

### Step 1: Initialize Git
```bash
cd "C:\Users\StarrButts\Downloads\NSB analysis ui redesign for chatgpt"
git init
```

### Step 2: Create .gitignore
Create a file named `.gitignore` with this content:
```
node_modules/
.env
.env.local
dist/
build/
.netlify/
test-results/
.DS_Store
*.log
.edge-temp/
data-store.json
```

### Step 3: Add and Commit
```bash
git add .
git commit -m "Initial commit: NSB Analysis UI Redesign"
```

### Step 4: Create GitHub Repository
1. Go to: https://github.com/new
2. Repository name: `nsb-analysis-ui-redesign`
3. Description: "NSB Analysis UI Redesign for ChatGPT"
4. Choose Public or Private
5. **Do NOT check "Initialize with README"**
6. Click "Create repository"

### Step 5: Push to GitHub
Replace `YOUR_USERNAME` with your GitHub username:
```bash
git remote add origin https://github.com/YOUR_USERNAME/nsb-analysis-ui-redesign.git
git branch -M main
git push -u origin main
```

---

## Troubleshooting

### Authentication Issues
If you get authentication errors:
1. GitHub may require a Personal Access Token instead of password
2. Go to: https://github.com/settings/tokens
3. Generate new token (classic)
4. Select scopes: `repo` (full control)
5. Use the token as your password when git asks

### "Remote already exists"
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/nsb-analysis-ui-redesign.git
```

### Files not being ignored
```bash
# Remove cached files
git rm -r --cached .
git add .
git commit -m "Fix .gitignore"
```

---

## What Gets Pushed

### ✅ Included:
- `Never-Sign-Blind-Analysis-App/` (all source code)
- `edge-dom.html`
- `nsb-app-redesign draft 1 not final.html`
- `nsb_brand_guide.html`
- `README.md`
- `.gitignore`

### ❌ Excluded (Protected):
- `.env` files (contains your API key)
- `node_modules/` (dependencies)
- `dist/`, `build/` (build outputs)
- `.edge-temp/` (temp files)
- `test-results/` (test outputs)

---

## After Pushing

1. ✅ Verify the push: Visit your repository on GitHub
2. ✅ Check the .env file is NOT visible on GitHub
3. ✅ Rotate your Anthropic API key: https://console.anthropic.com/settings/keys
4. ✅ Update your local .env file with the new key
5. ✅ Add collaborators if needed: Repository Settings → Collaborators

---

## Need Help?

- GitHub Docs: https://docs.github.com/en/get-started
- Git Basics: https://git-scm.com/book/en/v2/Getting-Started-Git-Basics
- Anthropic API Keys: https://console.anthropic.com/settings/keys

---

**Created by Claude** | Updated: 2026-04-15
