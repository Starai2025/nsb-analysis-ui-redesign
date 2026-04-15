@echo off
setlocal enabledelayedexpansion

echo ============================================
echo NSB Analysis UI - GitHub Repository Setup
echo ============================================
echo.

REM Security check
echo [SECURITY CHECK]
if exist "Never-Sign-Blind-Analysis-App\.env" (
    echo WARNING: .env file detected!
    echo Make sure your .env file is listed in .gitignore
    echo If you have API keys, consider rotating them after pushing to GitHub
    echo.
    pause
)

REM Get repository details
set /p REPO_NAME="Enter repository name [default: nsb-analysis-ui-redesign]: "
if "%REPO_NAME%"=="" set REPO_NAME=nsb-analysis-ui-redesign

set /p USERNAME="Enter your GitHub username: "
if "%USERNAME%"=="" (
    echo GitHub username is required!
    pause
    exit /b 1
)

echo.
echo ============================================
echo [STEP 1/5] Initializing Git Repository
echo ============================================

REM Navigate to the folder
cd /d "%~dp0"

REM Check if already a git repo
if exist ".git" (
    echo Git repository already exists. Skipping initialization.
) else (
    echo Initializing git repository...
    git init
    if errorlevel 1 (
        echo ERROR: Failed to initialize git repository
        pause
        exit /b 1
    )
    echo Git initialized successfully!
)

echo.
echo ============================================
echo [STEP 2/5] Creating .gitignore
echo ============================================

REM Create comprehensive .gitignore
(
echo # Dependencies
echo node_modules/
echo.
echo # Environment files
echo .env
echo .env.local
echo .env.*.local
echo.
echo # Build outputs
echo dist/
echo build/
echo .netlify/
echo.
echo # Test outputs
echo test-results/
echo coverage/
echo.
echo # OS files
echo .DS_Store
echo Thumbs.db
echo desktop.ini
echo.
echo # IDE
echo .vscode/
echo .idea/
echo *.swp
echo *.swo
echo.
echo # Logs
echo *.log
echo npm-debug.log*
echo.
echo # Temporary files
echo .edge-temp/
echo *.tmp
echo data-store.json
) > .gitignore

echo .gitignore created!

echo.
echo ============================================
echo [STEP 3/5] Creating README
echo ============================================

if exist "README.md" (
    echo README.md already exists. Skipping.
) else (
    (
    echo # NSB Analysis UI Redesign
    echo.
    echo This project contains the UI redesign for the Never Sign Blind Analysis App.
    echo.
    echo ## Project Structure
    echo.
    echo - **Never-Sign-Blind-Analysis-App/** - Main application with full stack setup
    echo - **edge-dom.html** - Edge DOM implementation
    echo - **nsb-app-redesign draft 1 not final.html** - Design draft v1
    echo - **nsb_brand_guide.html** - Brand guidelines and design system
    echo.
    echo ## Setup
    echo.
    echo ```bash
    echo cd Never-Sign-Blind-Analysis-App
    echo npm install
    echo npm run dev
    echo ```
    echo.
    echo ## Features
    echo.
    echo - Modern UI/UX redesign
    echo - Comprehensive brand guidelines
    echo - Interactive prototype
    echo.
    echo ## License
    echo.
    echo See LICENSE file for details.
    ) > README.md
    echo README.md created!
)

echo.
echo ============================================
echo [STEP 4/5] Committing Files
echo ============================================

echo Adding files to git...
git add .

echo Committing files...
git commit -m "Initial commit: NSB Analysis UI Redesign"
if errorlevel 1 (
    echo WARNING: Git commit failed or no changes to commit
    echo This might be okay if files were already committed
)

echo.
echo ============================================
echo [STEP 5/5] Creating GitHub Repository
echo ============================================

echo Opening GitHub in your browser...
start "" "https://github.com/new?name=%REPO_NAME%&description=NSB+Analysis+UI+Redesign+for+ChatGPT"

echo.
echo INSTRUCTIONS:
echo 1. GitHub should open in your browser
echo 2. Make sure the repository name is: %REPO_NAME%
echo 3. Choose Public or Private
echo 4. Do NOT check "Initialize with README"
echo 5. Click "Create repository"
echo 6. Come back here after creating
echo.
pause

echo.
echo Setting up remote and pushing...

set "REPO_URL=https://github.com/%USERNAME%/%REPO_NAME%.git"
echo Repository URL: !REPO_URL!

REM Remove existing origin if any
git remote remove origin 2>nul

REM Add new origin
echo Adding remote origin...
git remote add origin !REPO_URL!

REM Rename branch to main
echo Setting branch to main...
git branch -M main

REM Push to GitHub
echo Pushing to GitHub...
git push -u origin main

if errorlevel 1 (
    echo.
    echo ERROR: Push failed!
    echo.
    echo Common issues:
    echo 1. Make sure you created the repository on GitHub
    echo 2. Check your GitHub username is correct: %USERNAME%
    echo 3. You may need to authenticate with GitHub
    echo.
    echo Try running: git push -u origin main
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================
echo SUCCESS! Repository created and pushed!
echo ============================================
echo.
echo Your repository is now available at:
echo https://github.com/%USERNAME%/%REPO_NAME%
echo.
echo IMPORTANT: Remember to rotate your API keys if they were exposed!
echo.
pause
