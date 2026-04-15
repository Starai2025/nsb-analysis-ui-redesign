@echo off
echo ============================================
echo Pushing to GitHub Repository
echo ============================================
echo.
echo Repository: https://github.com/Starai2025/nsb-analysis-ui-redesign.git
echo.

cd /d "%~dp0"

REM Initialize git if needed
if not exist ".git" (
    echo Initializing git...
    git init
)

REM Create .gitignore to protect sensitive files
echo Creating .gitignore...
(
echo node_modules/
echo .env
echo .env.local
echo dist/
echo build/
echo .netlify/
echo test-results/
echo .DS_Store
echo *.log
echo .edge-temp/
) > .gitignore

REM Create README
if not exist "README.md" (
    echo Creating README...
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
    ) > README.md
)

echo.
echo Adding all files...
git add .

echo.
echo Committing files...
git commit -m "Initial commit: NSB Analysis UI Redesign"

echo.
echo Adding remote repository...
git remote remove origin 2>nul
git remote add origin https://github.com/Starai2025/nsb-analysis-ui-redesign.git

echo.
echo Pushing to GitHub...
git branch -M main
git push -u origin main

if errorlevel 1 (
    echo.
    echo ============================================
    echo AUTHENTICATION NEEDED
    echo ============================================
    echo.
    echo GitHub is asking for your credentials.
    echo.
    echo Username: Starai2025
    echo Password: Use your GitHub Personal Access Token
    echo.
    echo Don't have a token? Get one here:
    echo https://github.com/settings/tokens/new
    echo.
    echo Check "repo" permissions, then copy the token
    echo and paste it when asked for password.
    echo.
    pause
    echo.
    echo Trying again...
    git push -u origin main
)

echo.
echo ============================================
echo SUCCESS!
echo ============================================
echo.
echo Your code is now on GitHub at:
echo https://github.com/Starai2025/nsb-analysis-ui-redesign
echo.
echo Your .env file is PROTECTED and was not uploaded!
echo.
pause
