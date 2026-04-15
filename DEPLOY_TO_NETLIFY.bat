@echo off
echo ============================================
echo Deploying to Netlify (Direct Upload)
echo ============================================
echo.
echo This will deploy your files DIRECTLY to Netlify
echo No GitHub needed - just uploading from your computer!
echo.

cd /d "%~dp0"

echo Deploying to Netlify...
echo.

npx -y @netlify/mcp@latest --site-id ecedf355-0de7-4351-8db9-fb567368ebf5 --proxy-path "https://netlify-mcp.netlify.app/proxy/eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..wrNKIvQuS6aqCbGB.ibDw-dZKZX6DDnytyAsfHtItdW8oC0QpMUbs0ttnSdItzZsW9OhDSRRzYvsQszh-xL7Bc7KRfJBs9oqql22P48wiUZg65Qgvzw4qFRVgiCQ-hna4-ULYrUT8RdIC4Qi8miqlmS0m2tQJskseIGlQIOWfmvmGn94hvYihyQCV0Rqze_xh8LNEk7xfrOcIUCRaFRPymJ0yln1eUBTLQUvafUdpeywF59-9LC5WYsIXl6dLBBFiizDf4E-tUGztnE_n10ONf1QZmL1krAz3ACvHjLEMXSpNPjv-mG9WQNOOFbJE9pinrGtGy9VT8PuVEx7giBYhidLhMdFF64NYnZOCz1fJh9uRNftyqHx3uhJovC2UWK0Qrw.2dIHjH9ee0xoRh1cG0fZqQ"

echo.
echo ============================================
echo DEPLOYMENT COMPLETE!
echo ============================================
echo.
echo Your site is now live at:
echo https://nsb-analysis-ui-redesign.netlify.app
echo.
echo Your .env file was NOT uploaded (protected)
echo.
pause
