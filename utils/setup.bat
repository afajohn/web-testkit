@echo off
REM ========================================
REM   Playwright Test Setup Script
REM ========================================
REM This script sets up the project by:
REM - Checking Node.js/npm installation
REM - Installing npm dependencies
REM - Installing Playwright browsers
REM - Verifying the setup
REM ========================================
REM This script is designed for initial setup on new devices
REM It will install/update all dependencies and browsers
REM ========================================

setlocal enabledelayedexpansion
set "SETUP_ERROR=0"
set "INSTALLED_DEPS=0"
set "INSTALLED_BROWSERS=0"

echo.
echo ========================================
echo   Playwright Test Setup
echo ========================================
echo   This script will set up everything needed
echo   for running Playwright tests on this device
echo ========================================
echo.

REM Step 1: Check Node.js installation
echo [1/5] Checking Node.js installation...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo Minimum required version: 16.x
    set "SETUP_ERROR=1"
    goto END
) else (
    for /f "tokens=*" %%i in ('node --version') do set "NODE_VERSION=%%i"
    echo   ✓ Node.js found: !NODE_VERSION!
)

REM Step 2: Check npm installation
echo.
echo [2/5] Checking npm installation...
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: npm is not installed or not in PATH
    echo npm should come with Node.js installation
    set "SETUP_ERROR=1"
    goto END
) else (
    for /f "tokens=*" %%i in ('npm --version') do set "NPM_VERSION=%%i"
    echo   ✓ npm found: !NPM_VERSION!
)

REM Step 3: Install/Update npm dependencies
echo.
echo [3/5] Checking npm dependencies...
if exist "node_modules\" (
    echo   ✓ node_modules folder exists
    echo   Checking if all dependencies are installed...
    
    REM Check if critical package is installed
    call npm list @playwright/test >nul 2>&1
    if !ERRORLEVEL! NEQ 0 (
        echo   ⚠ @playwright/test not found - installing dependencies...
        echo   This may take a few minutes...
        call npm install
        if !ERRORLEVEL! EQU 0 (
            set "INSTALLED_DEPS=1"
            echo   ✓ Dependencies installed successfully
        ) else (
            echo   ✗ Failed to install dependencies
            echo   Please check your internet connection and try again
            set "SETUP_ERROR=1"
            goto END
        )
    ) else (
        REM Critical package found, check if all packages are consistent
        call npm list --depth=0 >nul 2>&1
        if !ERRORLEVEL! NEQ 0 (
            echo   ⚠ Some dependencies may be outdated or missing - updating...
            echo   This may take a few minutes...
            call npm install
            if !ERRORLEVEL! EQU 0 (
                set "INSTALLED_DEPS=1"
                echo   ✓ Dependencies updated successfully
            ) else (
                echo   ✗ Failed to update dependencies
                echo   Please check your internet connection and try again
                set "SETUP_ERROR=1"
                goto END
            )
        ) else (
            echo   ✓ All dependencies are already installed
            echo   (Skipping npm install - packages are up to date)
        )
    )
) else (
    REM node_modules doesn't exist, install dependencies
    echo   ⚠ node_modules not found - installing dependencies...
    echo   This may take a few minutes...
    call npm install
    if !ERRORLEVEL! EQU 0 (
        set "INSTALLED_DEPS=1"
        echo   ✓ Dependencies installed successfully
    ) else (
        echo   ✗ Failed to install dependencies
        echo   Please check your internet connection and try again
        set "SETUP_ERROR=1"
        goto END
    )
)

REM Verify critical dependencies are installed
echo   Verifying critical dependencies...
call npm list @playwright/test >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo   ✗ @playwright/test not found - installation may have failed
    set "SETUP_ERROR=1"
    goto END
) else (
    echo   ✓ @playwright/test found
)

call npm list playwright-seo >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo   ✓ playwright-seo found (automatic SEO audits enabled)
) else (
    echo   ⚠ playwright-seo not found (optional - for automatic SEO audits)
)

REM Step 4: Install Playwright browsers
echo.
echo [4/5] Installing Playwright browsers...
call npx playwright --version >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo   ✗ Playwright CLI not found
    echo   This should not happen if @playwright/test is installed
    set "SETUP_ERROR=1"
    goto END
) else (
    for /f "tokens=*" %%i in ('npx playwright --version') do set "PLAYWRIGHT_VERSION=%%i"
    echo   ✓ Playwright found: !PLAYWRIGHT_VERSION!
)

echo   Installing Chromium browser and system dependencies...
echo   This may take a few minutes...
call npx playwright install chromium --with-deps
if !ERRORLEVEL! EQU 0 (
    set "INSTALLED_BROWSERS=1"
    echo   ✓ Chromium browser installed successfully
) else (
    echo   ✗ Failed to install Chromium browser
    echo   You may need to run this script as administrator
    set "SETUP_ERROR=1"
    goto END
)

REM Step 5: Verify setup
echo.
echo [5/5] Verifying setup...
echo   Checking if Playwright can list tests...
call npx playwright test --list >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo   ✓ Setup verified successfully
    echo   ✓ Tests are ready to run
) else (
    echo   ⚠ Warning: Could not list tests
    echo   This may indicate syntax errors in test files
    echo   Setup completed, but please verify tests manually
    REM Don't set error - this is just a warning
)

REM Check for required files
echo.
echo Checking required files...
set "MISSING_FILES=0"

if not exist "package.json" (
    echo   ✗ package.json not found
    set "MISSING_FILES=1"
) else (
    echo   ✓ package.json found
)

if not exist "playwright.config.ts" (
    echo   ✗ playwright.config.ts not found
    set "MISSING_FILES=1"
) else (
    echo   ✓ playwright.config.ts found
)

if not exist "run-tests-menu.bat" (
    echo   ⚠ run-tests-menu.bat not found (optional)
) else (
    echo   ✓ run-tests-menu.bat found
)

if not exist "tests\" (
    echo   ✗ tests folder not found
    set "MISSING_FILES=1"
) else (
    echo   ✓ tests folder found
)

if not exist "utils\" (
    echo   ✗ utils folder not found
    set "MISSING_FILES=1"
) else (
    echo   ✓ utils folder found
)

if not exist "playwright-seo.config.ts" (
    echo   ⚠ playwright-seo.config.ts not found (optional - for automatic SEO audits)
) else (
    echo   ✓ playwright-seo.config.ts found
)

if not exist "tests\support\" (
    echo   ⚠ tests\support folder not found (optional - for SEO auto fixtures)
) else (
    echo   ✓ tests\support folder found
    if exist "tests\support\seo.auto.ts" (
        echo   ✓ tests\support\seo.auto.ts found
    ) else (
        echo   ⚠ tests\support\seo.auto.ts not found (optional - for automatic SEO audits)
    )
)

if !MISSING_FILES! EQU 1 (
    echo.
    echo   ⚠ Some required files are missing
    set "SETUP_ERROR=1"
)

REM Final summary
echo.
echo ========================================
if !SETUP_ERROR! EQU 0 (
    echo   Setup Completed Successfully!
    echo ========================================
    echo.
    if !INSTALLED_DEPS! EQU 1 (
        echo   ✓ Dependencies were installed
    )
    if !INSTALLED_BROWSERS! EQU 1 (
        echo   ✓ Playwright browsers were installed
    )
    echo.
    echo   You can now run tests using:
    echo   - run-tests-menu.bat (interactive menu)
    echo   - npm test (run all tests)
    echo   - npm run test:ui (run with UI mode)
    echo.
    echo   Features available:
    echo   - SEO checks (manual and automatic via playwright-seo)
    echo   - Broken links detection
    echo   - Accessibility testing
    echo   - Performance testing
    echo.
    pause
    exit /b 0
) else (
    echo   Setup Completed with Errors
    echo ========================================
    echo.
    echo   Please review the errors above and try again.
    echo   Common issues:
    echo   - Node.js not installed: Download from https://nodejs.org/
    echo   - Permission errors: Run as administrator
    echo   - Network issues: Check your internet connection
    echo.
    pause
    exit /b 1
)

:END
echo.
echo ========================================
echo   Setup Failed
echo ========================================
echo.
pause
exit /b 1

