@echo off
setlocal
title AURA UNIFIED COMMAND
color 0B

echo [STEP 1] Cleaning temporary session data...
if exist "reports\aura-dashboard\live-results.jsonl" del "reports\aura-dashboard\live-results.jsonl"

echo [STEP 2] Evicting Zombie Processes on Port 3000...
:: This line kills whatever is sitting on port 3000 without asking questions
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /f /pid %%a 2>nul

echo [STEP 3] Creating fresh Dashboard...
node scripts/generate-aggregated-report.js

echo [STEP 4] Launching Dashboard Server...
:: We use start /b to keep it in this window but in the background
start /b node scripts/serve-reports.js
timeout /t 3 > nul

echo.
echo 🌐 DASHBOARD: http://localhost:3000
echo.

echo [STEP 5] Starting Tests...
call npx playwright test tests/scaled-audit.spec.ts

echo [STEP 6] Finalizing Report...
node scripts/generate-aggregated-report.js

echo.
echo ===================================================
echo [DONE] Audit complete.
echo ===================================================
pause