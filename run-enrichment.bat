@echo off
:: ============================================================
:: run-enrichment.bat
:: Runs the enrichment script in a loop.
:: If it stops (rate limit / error), waits 90 minutes and retries.
:: Stops automatically when all books are done (Pending: 0)
:: ============================================================

set SCRIPT=migration/enrich-books-gemini-v9.ts
set WAIT_MINUTES=90
set MAX_RUNS=20

echo.
echo ========================================
echo   Book Enrichment — Auto Restart Loop
echo   Wait between runs: %WAIT_MINUTES% min
echo   Max runs: %MAX_RUNS%
echo ========================================
echo.

set /a RUN=0

:LOOP
set /a RUN+=1
echo.
echo [%TIME%] === Run %RUN%/%MAX_RUNS% ===
echo.

:: Run the enrichment script
npx ts-node --project tsconfig.migration.json %SCRIPT%

:: Check exit code
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [%TIME%] Script finished cleanly.
) else (
    echo.
    echo [%TIME%] Script exited with error code %ERRORLEVEL%
)

:: Check if we've hit max runs
if %RUN% GEQ %MAX_RUNS% (
    echo.
    echo Reached max runs (%MAX_RUNS%). Stopping.
    goto DONE
)

:: Check if there's still pending work by looking at state file
:: Count "pending" and "failed" entries
for /f %%i in ('type migration\enrichment-state.json ^| find /c "\"pending\""') do set PENDING=%%i
for /f %%i in ('type migration\enrichment-state.json ^| find /c "\"failed\""') do set FAILED=%%i

echo.
echo [%TIME%] State: pending=%PENDING%, failed=%FAILED%

:: If nothing pending and nothing failed — we're done!
if "%PENDING%"=="0" (
    if "%FAILED%"=="0" (
        echo.
        echo ========================================
        echo   ALL DONE! No more pending books.
        echo ========================================
        goto DONE
    )
)

:: Still work to do — wait and retry
echo.
echo [%TIME%] Waiting %WAIT_MINUTES% minutes before next run...
echo          (Close this window to stop)
echo.

:: Wait: timeout counts down in seconds
set /a WAIT_SECONDS=%WAIT_MINUTES%*60
timeout /t %WAIT_SECONDS% /nobreak

goto LOOP

:DONE
echo.
echo [%TIME%] Enrichment loop complete.
echo Results: migration\enriched-books.json
echo Review:  migration\needs-review.json
echo.
pause
