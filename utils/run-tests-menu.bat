@echo off
REM ========================================
REM   Playwright Test Runner - Menu
REM ========================================
REM Unified test runner with interactive menu
REM ========================================

setlocal enabledelayedexpansion

REM Load .env file if it exists
if exist .env (
    for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
        set "line=%%a"
        if not "!line:~0,1!"=="#" (
            if not "!line!"=="" (
                set "%%a=%%b"
            )
        )
    )
)

REM Main menu loop
:MAIN_MENU
cls
echo.
echo ========================================
echo   Playwright Test Runner
echo ========================================
echo.

REM Show current TEST_URL if available
if defined TEST_URL (
    echo Current URL: !TEST_URL!
    echo.
)

REM Show SEO audit status
if defined APP_ENV (
    if "!APP_ENV!"=="development" (
        echo Note: Automatic SEO audits are DISABLED (APP_ENV=development)
    ) else (
        echo Note: Automatic SEO audits are ENABLED (via playwright-seo)
    )
) else (
    echo Note: Automatic SEO audits are ENABLED (via playwright-seo)
)
echo.

echo MAIN OPTIONS:
echo   [1] Run All Tests
echo   [2] Test Specific URL
echo   [3] Run All Individual Tests
echo.
echo INDIVIDUAL TESTS:
echo   [4] SEO Tests (manual checks)
echo   [5] SEO Auto Tests (automatic audits via playwright-seo)
echo   [6] Broken Links Tests
echo   [7] Accessibility Tests
echo   [8] Comprehensive Audit
echo.
echo   [9] Test Multiple URLs
echo.
echo   [0] Exit
echo.
set /p "CHOICE=Enter your choice [0-9]: "

REM Validate choice
if "!CHOICE!"=="" goto INVALID
if "!CHOICE!"=="0" goto EXIT
if "!CHOICE!"=="1" goto RUN_ALL
if "!CHOICE!"=="2" goto TEST_URL
if "!CHOICE!"=="3" goto RUN_ALL_INDIVIDUAL
if "!CHOICE!"=="4" goto RUN_SEO
if "!CHOICE!"=="5" goto RUN_SEO_AUTO
if "!CHOICE!"=="6" goto RUN_BROKEN_LINKS
if "!CHOICE!"=="7" goto RUN_ACCESSIBILITY
if "!CHOICE!"=="8" goto RUN_COMPREHENSIVE
if "!CHOICE!"=="9" goto TEST_MULTIPLE_URLS
goto INVALID

:INVALID
echo.
echo Invalid choice. Please select 0-9.
timeout /t 2 >nul
goto MAIN_MENU

:EXIT
echo.
echo Exiting...
exit /b 0

:ASK_N8N
echo.
set /p "USE_N8N=Send results to n8n? (Y/N): "
if /i "!USE_N8N!"=="Y" (
    set "USE_N8N=1"
) else if /i "!USE_N8N!"=="N" (
    set "USE_N8N=0"
) else (
    echo Invalid input. Please enter Y or N.
    goto ASK_N8N
)
exit /b

:RUN_ALL
echo.
echo Running all tests...
echo Note: Includes automatic SEO audits (via playwright-seo) for tests using seo.auto fixture
call :ASK_N8N
if !USE_N8N! EQU 1 (
    echo Sending results to n8n...
    echo.
    call npm run test:n8n
) else (
    call npm test
)
set "EXIT_CODE=!ERRORLEVEL!"
goto SHOW_RESULT

:TEST_URL
echo.
set /p "TEST_URL_INPUT=Enter URL to test (or press Enter to use TEST_URL from .env): "
if "!TEST_URL_INPUT!"=="" (
    if defined TEST_URL (
        set "TEST_URL_INPUT=!TEST_URL!"
        echo Using URL from .env: !TEST_URL!
    ) else (
        echo Error: No URL provided and TEST_URL not set in .env
        echo Please enter a URL or set TEST_URL in .env file
        timeout /t 3 >nul
        goto MAIN_MENU
    )
)
echo.
call :ASK_N8N
if !USE_N8N! EQU 1 (
    echo Testing URL: !TEST_URL_INPUT!
    echo Sending results to n8n...
    echo.
    call npm run test:url:n8n -- !TEST_URL_INPUT!
) else (
    echo Testing URL: !TEST_URL_INPUT!
    echo.
    call npm run test:url -- !TEST_URL_INPUT!
)
set "EXIT_CODE=!ERRORLEVEL!"
goto SHOW_RESULT

:RUN_ALL_INDIVIDUAL
echo.
echo Running all individual test categories...
call :ASK_N8N
if !USE_N8N! EQU 1 (
    call npm run test:audits
    set "EXIT_CODE=!ERRORLEVEL!"
    if !EXIT_CODE! EQU 0 (
        call npm run send:n8n
    )
) else (
    call npm run test:audits
    set "EXIT_CODE=!ERRORLEVEL!"
)
goto SHOW_RESULT

:RUN_SEO
echo.
echo Running SEO tests (manual checks)...
call :ASK_N8N
if !USE_N8N! EQU 1 (
    call npx playwright test tests/seo-checks.spec.ts
    set "EXIT_CODE=!ERRORLEVEL!"
    if !EXIT_CODE! EQU 0 (
        call npm run send:n8n
    )
) else (
    call npx playwright test tests/seo-checks.spec.ts
    set "EXIT_CODE=!ERRORLEVEL!"
)
goto SHOW_RESULT

:RUN_SEO_AUTO
echo.
echo Running SEO Auto Tests (automatic audits via playwright-seo)...
echo Note: These tests automatically run SEO audits after each test
call :ASK_N8N
if !USE_N8N! EQU 1 (
    call npx playwright test tests/seo-auto-test.spec.ts
    set "EXIT_CODE=!ERRORLEVEL!"
    if !EXIT_CODE! EQU 0 (
        call npm run send:n8n
    )
) else (
    call npx playwright test tests/seo-auto-test.spec.ts
    set "EXIT_CODE=!ERRORLEVEL!"
)
goto SHOW_RESULT

:RUN_BROKEN_LINKS
echo.
echo Running Broken Links tests...
call :ASK_N8N
if !USE_N8N! EQU 1 (
    call npx playwright test tests/broken-links.spec.ts
    set "EXIT_CODE=!ERRORLEVEL!"
    if !EXIT_CODE! EQU 0 (
        call npm run send:n8n
    )
) else (
    call npx playwright test tests/broken-links.spec.ts
    set "EXIT_CODE=!ERRORLEVEL!"
)
goto SHOW_RESULT

:RUN_ACCESSIBILITY
echo.
echo Running Accessibility tests...
call :ASK_N8N
if !USE_N8N! EQU 1 (
    call npx playwright test tests/accessibility.spec.ts
    set "EXIT_CODE=!ERRORLEVEL!"
    if !EXIT_CODE! EQU 0 (
        call npm run send:n8n
    )
) else (
    call npx playwright test tests/accessibility.spec.ts
    set "EXIT_CODE=!ERRORLEVEL!"
)
goto SHOW_RESULT

:RUN_COMPREHENSIVE
echo.
echo Running Comprehensive Audit...
call :ASK_N8N
if !USE_N8N! EQU 1 (
    call npx playwright test tests/comprehensive-audit.spec.ts
    set "EXIT_CODE=!ERRORLEVEL!"
    if !EXIT_CODE! EQU 0 (
        call npm run send:n8n
    )
) else (
    call npx playwright test tests/comprehensive-audit.spec.ts
    set "EXIT_CODE=!ERRORLEVEL!"
)
goto SHOW_RESULT

:TEST_MULTIPLE_URLS
echo.
set /p "URLS_FILE=Enter path to URLs file (e.g., urls.txt): "
if "!URLS_FILE!"=="" (
    echo.
    echo Error: No file path provided
    echo Press any key to return to menu...
    pause >nul
    goto MAIN_MENU
)
REM Remove quotes if user added them
set "URLS_FILE=!URLS_FILE:"=!"
REM Trim leading/trailing spaces
for /f "tokens=* delims= " %%a in ("!URLS_FILE!") do set "URLS_FILE=%%a"
if not exist !URLS_FILE! (
    echo.
    echo Error: File not found: !URLS_FILE!
    echo Current directory: %CD%
    echo Please check the file path and try again
    echo Press any key to return to menu...
    pause >nul
    goto MAIN_MENU
)
echo.
call :ASK_N8N
echo.
if !USE_N8N! EQU 1 (
    echo Testing URLs from file: !URLS_FILE!
    echo Sending results to n8n...
    echo.
    call node test-multiple-urls.js "!URLS_FILE!" --n8n
    set "EXIT_CODE=!ERRORLEVEL!"
) else (
    echo Testing URLs from file: !URLS_FILE!
    echo.
    call node test-multiple-urls.js "!URLS_FILE!"
    set "EXIT_CODE=!ERRORLEVEL!"
)
goto SHOW_RESULT

:SHOW_RESULT
echo.
echo ========================================
if !EXIT_CODE! EQU 0 (
    echo   Tests completed successfully!
    if !USE_N8N! EQU 1 (
        echo   Results have been sent to n8n
    )
) else (
    echo   Tests completed with errors (Exit code: !EXIT_CODE!)
    if !USE_N8N! EQU 1 (
        echo.
        echo   Troubleshooting:
        echo   - Check if n8n is running: n8n
        echo   - Verify workflow is ACTIVATED (green toggle)
        echo   - Check webhook URL: http://localhost:5678/webhook/playwright-results
    )
)
echo ========================================
echo.
pause
goto MAIN_MENU

