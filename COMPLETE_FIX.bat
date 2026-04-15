@echo off
echo ============================================
echo Complete GitHub Repository Fix
echo ============================================
echo.
echo This will fix ALL issues blocking Netlify deployment
echo.

cd /d "%~dp0"

echo Step 1: Removing broken .gitmodules file...
del .gitmodules 2>nul

echo Step 2: Removing submodule from git cache...
git rm --cached Never-Sign-Blind-Analysis-App 2>nul
git rm -r Never-Sign-Blind-Analysis-App/.git 2>nul
rmdir /s /q Never-Sign-Blind-Analysis-App\.git 2>nul

echo Step 3: Creating clean README...
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

echo Step 4: Adding all files (including Never-Sign-Blind-Analysis-App as regular folder)...
git add -A

echo Step 5: Committing fixes...
git commit -m "Fix: Remove submodule, resolve merge conflicts, add all files properly"

echo Step 6: Force pushing to GitHub (clean slate)...
git push origin main --force

if errorlevel 1 (
    echo.
    echo If it asks for credentials:
    echo Username: Starai2025
    echo Password: Your GitHub Personal Access Token
    echo.
    pause
    git push origin main --force
)

echo.
echo ============================================
echo SUCCESS! GitHub Repository Fixed!
echo ============================================
echo.
echo Your repository is now clean and ready.
echo.
echo Next: Go to Netlify and click "Retry deploy"
echo Netlify will now deploy from your GitHub repo!
echo.
echo Your partner can now collaborate via GitHub
echo.
pause
