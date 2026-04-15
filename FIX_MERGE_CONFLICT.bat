@echo off
echo ============================================
echo Fixing Merge Conflict in README
echo ============================================
echo.

cd /d "%~dp0"

echo Creating clean README without conflicts...
(
echo # NSB Analysis UI Redesign
echo.
echo NSB Analysis UI Redesign for ChatGPT
echo.
echo ## Project Structure
echo.
echo - **Never-Sign-Blind-Analysis-App/** - Main application
echo - **edge-dom.html** - Edge DOM implementation  
echo - **nsb-app-redesign draft 1 not final.html** - Design draft
echo - **nsb_brand_guide.html** - Brand guidelines
echo.
echo ## Setup
echo.
echo This project contains the UI redesign files for the Never Sign Blind Analysis application.
) > README.md

echo Adding the fixed README...
git add README.md

echo Committing the fix...
git commit -m "Fix: Resolve README merge conflict"

echo Pushing to GitHub...
git push origin main

if errorlevel 1 (
    echo.
    echo ERROR: Push failed!
    echo If it asks for credentials:
    echo Username: Starai2025
    echo Password: Your GitHub Personal Access Token
    echo.
    pause
    git push origin main
)

echo.
echo ============================================
echo SUCCESS! Merge conflict fixed!
echo ============================================
echo.
echo The README conflict has been resolved.
echo Now go back to Netlify and retry the deployment!
echo.
pause
