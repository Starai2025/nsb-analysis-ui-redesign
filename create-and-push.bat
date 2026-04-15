@echo off
echo ============================================
echo Auto GitHub Repository Creator
echo ============================================
echo.

set /p REPO_NAME="Enter repository name (default: nsb-analysis-ui-redesign): "
if "%REPO_NAME%"=="" set REPO_NAME=nsb-analysis-ui-redesign

set /p DESCRIPTION="Enter repository description (optional): "
if "%DESCRIPTION%"=="" set DESCRIPTION=NSB Analysis UI Redesign for ChatGPT

echo.
echo Opening GitHub to create repository...
echo Repository name: %REPO_NAME%
echo Description: %DESCRIPTION%
echo.

REM URL encode the description
set "ENCODED_DESC=%DESCRIPTION: =+%"

REM Open browser to GitHub new repository page with pre-filled info
start "" "https://github.com/new?name=%REPO_NAME%&description=%ENCODED_DESC%"

echo.
echo ============================================
echo INSTRUCTIONS:
echo ============================================
echo 1. Your browser should open to GitHub's create repository page
echo 2. Make sure you're logged into GitHub
echo 3. The repository name and description should be pre-filled
echo 4. Keep "Public" selected (or choose Private if you prefer)
echo 5. Do NOT check "Initialize this repository with a README"
echo 6. Click "Create repository"
echo 7. After creating, GitHub will show you commands to push
echo 8. Copy your repository URL and come back here
echo.

set /p REPO_URL="Paste your GitHub repository URL (e.g., https://github.com/username/repo.git): "

if "%REPO_URL%"=="" (
    echo No URL provided. Exiting...
    pause
    exit /b
)

echo.
echo Setting up git repository...
cd /d "%~dp0"

REM Initialize git if needed
if not exist ".git" (
    git init
    echo Git initialized.
)

REM Create .gitignore if needed
if not exist ".gitignore" (
    echo Creating .gitignore...
    echo node_modules/ > .gitignore
    echo .env >> .gitignore
    echo dist/ >> .gitignore
    echo .DS_Store >> .gitignore
    echo *.log >> .gitignore
    echo .edge-temp/ >> .gitignore
    echo test-results/ >> .gitignore
)

REM Create README if needed
if not exist "README.md" (
    echo Creating README.md...
    echo # %REPO_NAME% > README.md
    echo. >> README.md
    echo %DESCRIPTION% >> README.md
)

echo Adding files...
git add .

echo Committing files...
git commit -m "Initial commit: %REPO_NAME%"

echo Adding remote origin...
git remote add origin %REPO_URL%

echo Pushing to GitHub...
git branch -M main
git push -u origin main

echo.
echo ============================================
echo SUCCESS! Your repository has been pushed to GitHub!
echo ============================================
echo.
echo View your repository at:
echo %REPO_URL:.git=%
echo.
pause
