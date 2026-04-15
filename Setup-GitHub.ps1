# NSB Analysis UI - GitHub Setup Script (PowerShell)
# Run this with: .\Setup-GitHub.ps1

param(
    [string]$RepoName = "nsb-analysis-ui-redesign",
    [string]$Username = ""
)

# Set error action preference
$ErrorActionPreference = "Stop"

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "NSB Analysis UI - GitHub Repository Setup" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

# Security check
Write-Host "[SECURITY CHECK]" -ForegroundColor Yellow
if (Test-Path "Never-Sign-Blind-Analysis-App\.env") {
    Write-Host "⚠️  WARNING: .env file detected!" -ForegroundColor Red
    Write-Host "   Make sure your .env file is in .gitignore" -ForegroundColor Yellow
    Write-Host "   You should rotate any API keys after pushing to GitHub`n" -ForegroundColor Yellow
    Read-Host "Press Enter to continue"
}

# Get GitHub username if not provided
if (-not $Username) {
    $Username = Read-Host "Enter your GitHub username"
    if (-not $Username) {
        Write-Host "❌ GitHub username is required!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "[STEP 1/5] Initializing Git Repository" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

# Check if git is available
try {
    git --version | Out-Null
} catch {
    Write-Host "❌ Git is not installed or not in PATH" -ForegroundColor Red
    Write-Host "   Download from: https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}

# Initialize git if needed
if (Test-Path ".git") {
    Write-Host "✓ Git repository already exists" -ForegroundColor Green
} else {
    Write-Host "Initializing git repository..." -ForegroundColor Yellow
    git init
    Write-Host "✓ Git initialized successfully!" -ForegroundColor Green
}

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "[STEP 2/5] Creating .gitignore" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

$gitignoreContent = @"
# Dependencies
node_modules/

# Environment files
.env
.env.local
.env.*.local

# Build outputs
dist/
build/
.netlify/

# Test outputs
test-results/
coverage/

# OS files
.DS_Store
Thumbs.db
desktop.ini

# IDE
.vscode/
.idea/
*.swp
*.swo

# Logs
*.log
npm-debug.log*

# Temporary files
.edge-temp/
*.tmp
data-store.json
"@

$gitignoreContent | Out-File -FilePath ".gitignore" -Encoding utf8
Write-Host "✓ .gitignore created!" -ForegroundColor Green

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "[STEP 3/5] Creating README" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

if (Test-Path "README.md") {
    Write-Host "✓ README.md already exists" -ForegroundColor Green
} else {
    $readmeContent = @"
# NSB Analysis UI Redesign

This project contains the UI redesign for the Never Sign Blind Analysis App.

## Project Structure

- **Never-Sign-Blind-Analysis-App/** - Main application with full stack setup
- **edge-dom.html** - Edge DOM implementation  
- **nsb-app-redesign draft 1 not final.html** - Design draft v1
- **nsb_brand_guide.html** - Brand guidelines and design system

## Setup

``````bash
cd Never-Sign-Blind-Analysis-App
npm install
npm run dev
``````

## Features

- Modern UI/UX redesign
- Comprehensive brand guidelines
- Interactive prototype

## License

See LICENSE file for details.
"@
    $readmeContent | Out-File -FilePath "README.md" -Encoding utf8
    Write-Host "✓ README.md created!" -ForegroundColor Green
}

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "[STEP 4/5] Committing Files" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

Write-Host "Adding files to git..." -ForegroundColor Yellow
git add .

Write-Host "Committing files..." -ForegroundColor Yellow
try {
    git commit -m "Initial commit: NSB Analysis UI Redesign"
    Write-Host "✓ Files committed successfully!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  No changes to commit (this is okay)" -ForegroundColor Yellow
}

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "[STEP 5/5] Creating GitHub Repository" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

# Open GitHub in browser
$githubUrl = "https://github.com/new?name=$RepoName&description=NSB+Analysis+UI+Redesign+for+ChatGPT"
Write-Host "Opening GitHub in your browser..." -ForegroundColor Yellow
Start-Process $githubUrl

Write-Host "`nINSTRUCTIONS:" -ForegroundColor Cyan
Write-Host "1. GitHub should open in your browser"
Write-Host "2. Make sure the repository name is: $RepoName"
Write-Host "3. Choose Public or Private"
Write-Host "4. Do NOT check 'Initialize with README'"
Write-Host "5. Click 'Create repository'"
Write-Host "6. Come back here after creating`n"
Read-Host "Press Enter after you've created the repository on GitHub"

Write-Host "`nSetting up remote and pushing..." -ForegroundColor Yellow

$repoUrl = "https://github.com/$Username/$RepoName.git"
Write-Host "Repository URL: $repoUrl" -ForegroundColor Cyan

# Remove existing origin if any
try {
    git remote remove origin 2>$null
} catch {
    # Ignore error if origin doesn't exist
}

# Add new origin
Write-Host "Adding remote origin..." -ForegroundColor Yellow
git remote add origin $repoUrl

# Rename branch to main
Write-Host "Setting branch to main..." -ForegroundColor Yellow
git branch -M main

# Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
try {
    git push -u origin main
    
    Write-Host "`n============================================" -ForegroundColor Green
    Write-Host "✓ SUCCESS! Repository created and pushed!" -ForegroundColor Green
    Write-Host "============================================`n" -ForegroundColor Green
    
    Write-Host "Your repository is now available at:" -ForegroundColor Cyan
    Write-Host "https://github.com/$Username/$RepoName`n" -ForegroundColor White
    
    Write-Host "⚠️  IMPORTANT: Remember to rotate your API keys if they were exposed!`n" -ForegroundColor Yellow
    
} catch {
    Write-Host "`n❌ ERROR: Push failed!`n" -ForegroundColor Red
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "1. Make sure you created the repository on GitHub"
    Write-Host "2. Check your GitHub username is correct: $Username"
    Write-Host "3. You may need to authenticate with GitHub`n"
    Write-Host "Try running: git push -u origin main`n" -ForegroundColor Cyan
    exit 1
}

Read-Host "`nPress Enter to exit"
