@echo off
SETLOCAL EnableDelayedExpansion
title QA COMMAND BRIDGE // MINT EDITION

:menu
cls
echo ===================================================
echo   QA COMMAND BRIDGE // MINT EDITION
echo   "Efficiency is the only religion."
echo ===================================================
echo   1. START WATCHER      (Background monitoring)
echo   2. OPEN DASHBOARD     (Launch in Browser)
echo   3. RUN BATCH AUDIT    (Process .txt list)
echo   4. RUN SINGLE URL     (Targeted Scan)
echo   5. SYSTEM RESET       (Clear all data)
echo   6. EXIT
echo ===================================================
set /p choice="ENTER SELECTION [1-6]: "

if "%choice%"=="1" goto watcher
if "%choice%"=="2" goto dashboard
if "%choice%"=="3" goto batch
if "%choice%"=="4" goto single
if "%choice%"=="5" goto clear
if "%choice%"=="6" exit
goto menu

:watcher
echo [SYSTEM] Starting Watcher in a new terminal...
:: This opens a separate window that stays open and builds your JSONs
start cmd /k "title QA WATCHER && npx ts-node aggregator/watch-and-build.ts"
echo [SUCCESS] Watcher is active.
pause
goto menu

:dashboard
echo [SYSTEM] Starting a local server...
:: This starts a tiny server using Node's 'serve' package
:: If you don't have it, it will ask to install once.
start cmd /k "title QA DASHBOARD SERVER && npx serve dashboard"
timeout /t 2 >nul
echo [SYSTEM] Launching Browser...
:: 'serve' usually defaults to port 3000
start http://localhost:3000
echo [SUCCESS] Dashboard is live.
pause
goto menu

:batch
echo.
echo Available targets in /urls:
dir /b urls\*.txt
echo.
set /p filename="Enter filename (e.g. poltavawomen.com.txt): "
if not exist "urls\%filename%" (
    echo [ERROR] File "urls\%filename%" not found!
    pause
    goto menu
)
echo [SYSTEM] Deploying parallel workers for %filename%...
npx ts-node runner/batch-run.ts %filename%
echo.
echo [SUCCESS] Batch complete. 
pause
goto menu

:single
set /p target="Enter Full URL (e.g. https://example.com): "
echo [SYSTEM] Scanning single target...
npx ts-node runner/scan-url-core.ts %target%
echo [SUCCESS] Scan complete.
pause
goto menu

:clear
echo [WARNING] This will Nuke all raw data and the dashboard results.
set /p confirm="Are you absolutely sure? (Y/N): "
if /i "%confirm%"=="Y" (
    echo [SYSTEM] Purging data chambers...
    if exist "data" rd /s /q "data"
    if exist "dashboard\data\aggregated.json" del "dashboard\data\aggregated.json"
    mkdir data
    echo [SUCCESS] System reset to factory settings.
)
pause
goto menu