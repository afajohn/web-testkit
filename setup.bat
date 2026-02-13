@echo off
SETLOCAL EnableDelayedExpansion
title QA FLEET - SETUP

echo ===================================================
echo   PROTOCOL: QA FLEET SETUP
echo   "Building the temple for your data."
echo ===================================================

:: 1. Check for Node.js
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is NOT installed. Install it first, darling.
    pause
    exit /b
)

:: 2. Initialize Project
IF NOT EXIST "package.json" (
    echo [INFO] Creating package.json...
    call npm init -y >nul
)

:: 3. Install Dependencies
echo [INFO] Installing Brains (Playwright, TS, Axe)...
call npm install --save-dev playwright typescript ts-node @types/node @axe-core/playwright

:: 4. Install Browsers
echo [INFO] Installing Chromium headless...
call npx playwright install chromium

:: 5. Create Directory Structure
echo [INFO] Constructing folder architecture...
for %%d in (runner checks data aggregator dashboard dashboard\data urls .vscode) do (
    if not exist "%%d" mkdir "%%d"
)

:: 6. Create tsconfig.json
IF NOT EXIST "tsconfig.json" (
    echo [INFO] Generating strict tsconfig.json...
    (
        echo {
        echo   "compilerOptions": {
        echo     "target": "ES2020",
        echo     "module": "commonjs",
        echo     "strict": true,
        echo     "esModuleInterop": true,
        echo     "skipLibCheck": true,
        echo     "forceConsistentCasingInFileNames": true,
        echo     "outDir": "./dist"
        echo   },
        echo   "include": ["runner/**/*", "checks/**/*", "aggregator/**/*"],
        echo   "exclude": ["node_modules"]
        echo }
    ) > tsconfig.json
)

:: 7. Create .gitignore (Protection)
IF NOT EXIST ".gitignore" (
    echo [INFO] Creating .gitignore...
    (
        echo node_modules/
        echo data/
        echo dashboard/data/aggregated.json
        echo .env
        echo *.log
    ) > .gitignore
)

echo.
echo ===================================================
echo   ✅ SETUP COMPLETE. 
echo   Your empire is ready for deployment.
echo ===================================================
pause