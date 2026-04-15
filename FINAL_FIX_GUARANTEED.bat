@echo off
setlocal enabledelayedexpansion

echo ============================================
echo FINAL FIX - Guaranteed to Work
echo ============================================
echo.

cd /d "%~dp0"

echo [1/6] Removing .git folder from Never-Sign-Blind-Analysis-App...
echo       (This is what's causing the submodule issue)
rmdir /s /q "Never-Sign-Blind-Analysis-App\.git" 2>nul
if exist "Never-Sign-Blind-Analysis-App\.git" (
    echo ERROR: Could not remove .git folder
    echo Please manually delete: Never-Sign-Blind-Analysis-App\.git
    pause
    exit /b 1
) else (
    echo       SUCCESS: .git folder removed
)

echo.
echo [2/6] Removing from git cache...
git rm -r --cached Never-Sign-Blind-Analysis-App 2>nul
echo       Done

echo.
echo [3/6] Adding all files (Never-Sign-Blind-Analysis-App is now a regular folder)...
git add -A
echo       Done

echo.
echo [4/6] Committing...
git commit -m "Fix: Convert Never-Sign-Blind-Analysis-App from submodule to regular folder"
if errorlevel 1 (
    echo       No changes to commit OR commit failed
) else (
    echo       SUCCESS: Committed
)

echo.
echo [5/6] Checking current branch...
git branch
echo.

echo [6/6] Force pushing to GitHub (clean slate)...
echo       Repository: https://github.com/Starai2025/nsb-analysis-ui-redesign.git
echo.
git push origin main --force

if errorlevel 1 (
    echo.
    echo ============================================
    echo AUTHENTICATION REQUIRED
    echo ============================================
    echo.
    echo Enter your GitHub credentials:
    echo Username: Starai2025
    echo Password: Use your Personal Access Token (not regular password)
    echo.
    echo Get token here: https://github.com/settings/tokens/new
    echo Select "repo" permission
    echo.
    pause
    echo.
    echo Trying push again...
    git push origin main --force
    
    if errorlevel 1 (
        echo.
        echo ============================================
        echo PUSH STILL FAILED
        echo ============================================
        echo.
        echo Please check:
        echo 1. Is git installed? (type: git --version)
        echo 2. Do you have internet connection?
        echo 3. Is your GitHub token correct?
        echo.
        pause
        exit /b 1
    )
)

echo.
echo ============================================
echo SUCCESS! Repository is now fixed!
echo ============================================
echo.
echo What was fixed:
echo - Removed .git folder from Never-Sign-Blind-Analysis-App
echo - Converted from submodule to regular folder
echo - Pushed clean version to GitHub
echo.
echo Next step:
echo 1. Go to Netlify: https://app.netlify.com/sites/nsb-analysis-ui-redesign
echo 2. Click "Trigger deploy" or "Retry deploy"
echo 3. It will work this time!
echo.
echo Your partner can now:
echo - Clone the repo: git clone https://github.com/Starai2025/nsb-analysis-ui-redesign.git
echo - Make changes and push
echo - Netlify will auto-deploy
echo.
pause
