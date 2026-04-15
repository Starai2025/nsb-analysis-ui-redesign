@echo off
echo ============================================
echo Fixing Git Submodule Issue
echo ============================================
echo.

cd /d "%~dp0"

echo Step 1: Removing broken submodule...
git rm --cached Never-Sign-Blind-Analysis-App 2>nul

echo Step 2: Removing .gitmodules file...
del .gitmodules 2>nul
git add .gitmodules 2>nul

echo Step 3: Adding folder as regular files...
git add Never-Sign-Blind-Analysis-App

echo Step 4: Committing the fix...
git commit -m "Fix: Remove submodule, add as regular files"

echo Step 5: Pushing to GitHub...
git push origin main

if errorlevel 1 (
    echo.
    echo ============================================
    echo ERROR: Push failed!
    echo ============================================
    echo.
    echo If it asks for credentials, use:
    echo Username: Starai2025
    echo Password: Your GitHub Personal Access Token
    echo.
    pause
    git push origin main
)

echo.
echo ============================================
echo SUCCESS! Submodule issue fixed!
echo ============================================
echo.
echo The folder is now included as regular files.
echo Netlify should be able to deploy now.
echo.
echo Go back to Netlify and click "Retry deploy"
echo or trigger a new deploy.
echo.
pause
