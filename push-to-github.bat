@echo off
echo ============================================
echo GitHub Repository Setup Script
echo ============================================
echo.

REM Navigate to the folder
cd /d "%~dp0"

REM Check if git is initialized
if not exist ".git" (
    echo Initializing git repository...
    git init
    echo Git repository initialized!
    echo.
) else (
    echo Git repository already exists.
    echo.
)

REM Create a README if it doesn't exist
if not exist "README.md" (
    echo Creating README.md...
    echo # NSB Analysis UI Redesign > README.md
    echo. >> README.md
    echo This project contains the UI redesign for Never Sign Blind Analysis App. >> README.md
    echo. >> README.md
    echo ## Project Structure >> README.md
    echo. >> README.md
    echo - `Never-Sign-Blind-Analysis-App/` - Main application folder >> README.md
    echo - `edge-dom.html` - Edge DOM implementation >> README.md
    echo - `nsb-app-redesign draft 1 not final.html` - Design draft >> README.md
    echo - `nsb_brand_guide.html` - Brand guidelines >> README.md
)

REM Create .gitignore
echo Creating .gitignore...
echo node_modules/ > .gitignore
echo .env >> .gitignore
echo dist/ >> .gitignore
echo .DS_Store >> .gitignore
echo *.log >> .gitignore
echo .edge-temp/ >> .gitignore

REM Add all files
echo Adding files to git...
git add .

REM Commit
echo Committing files...
git commit -m "Initial commit: NSB Analysis UI Redesign"

echo.
echo ============================================
echo Git setup complete!
echo ============================================
echo.
echo NEXT STEPS:
echo 1. Go to https://github.com/new
echo 2. Create a new repository named "nsb-analysis-ui-redesign"
echo 3. Do NOT initialize with README, .gitignore, or license
echo 4. After creating the repo, come back here
echo.
echo Then run ONE of these commands (replace USERNAME with your GitHub username):
echo.
echo For HTTPS (will ask for password/token):
echo   git remote add origin https://github.com/USERNAME/nsb-analysis-ui-redesign.git
echo   git branch -M main
echo   git push -u origin main
echo.
echo For SSH (if you have SSH keys set up):
echo   git remote add origin git@github.com:USERNAME/nsb-analysis-ui-redesign.git
echo   git branch -M main
echo   git push -u origin main
echo.
echo ============================================
echo.
pause
