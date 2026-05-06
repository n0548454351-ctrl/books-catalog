@echo off
:: ============================================================
:: run-enrichment-v2.bat
:: Runs enrichment in a loop until all books are done.
:: Waits 90 minutes between runs (Gemini free tier resets daily).
:: ============================================================

set SCRIPT=migration/enrich-books-gemini-v10.ts
set WAIT_MINUTES=90
set MAX_RUNS=30

echo.
echo ========================================
echo   Book Enrichment Auto Restart v2
echo   Script : %SCRIPT%
echo   Wait   : %WAIT_MINUTES% min between runs
echo   Max    : %MAX_RUNS% runs
echo ========================================
echo.

set /a RUN=0

:LOOP
set /a RUN+=1
echo.
echo [%TIME%] ===== Run %RUN%/%MAX_RUNS% =====
echo.

:: Run the enrichment script
npx ts-node --project tsconfig.migration.json %SCRIPT%

echo.
echo [%TIME%] Run %RUN% finished.

:: Stop if max runs reached
if %RUN% GEQ %MAX_RUNS% (
    echo Reached max runs. Stopping.
    goto DONE
)

:: Check how many are still pending using Node.js (more reliable than findstr)
echo Checking remaining work...
node -e "
const fs = require('fs');
const f = 'migration/enrichment-state.json';
if (!fs.existsSync(f)) { console.log('PENDING=unknown'); process.exit(0); }
const data = JSON.parse(fs.readFileSync(f, 'utf-8'));
const pending = data.filter(r => r.status === 'pending').length;
const done    = data.filter(r => r.status === 'done').length;
const review  = data.filter(r => r.status === 'needs_review').length;
const failed  = data.filter(r => r.status === 'failed').length;
console.log('DONE=' + done);
console.log('PENDING=' + pending);
console.log('REVIEW=' + review);
console.log('FAILED=' + failed);
" > %TEMP%\book_status.txt 2>&1

type %TEMP%\book_status.txt

:: Parse the values
for /f "tokens=2 delims==" %%a in ('findstr "PENDING" %TEMP%\book_status.txt') do set PENDING=%%a
for /f "tokens=2 delims==" %%a in ('findstr "DONE"    %TEMP%\book_status.txt') do set DONE=%%a
for /f "tokens=2 delims==" %%a in ('findstr "FAILED"  %TEMP%\book_status.txt') do set FAILED=%%a

echo.
echo [%TIME%] Status: Done=%DONE% Pending=%PENDING% Failed=%FAILED%

:: If nothing pending — we're done!
if "%PENDING%"=="0" (
    echo.
    echo ========================================
    echo   ALL DONE! No more pending books.
    echo   Done    : %DONE%
    echo   Review  : see migration\needs-review.json
    echo   Failed  : %FAILED%
    echo ========================================
    goto DONE
)

:: Still work to do — wait and retry
echo.
echo [%TIME%] %PENDING% books still pending.
echo          Waiting %WAIT_MINUTES% minutes before next run...
echo          (Close this window anytime to stop safely)
echo.

set /a WAIT_SECONDS=%WAIT_MINUTES%*60
timeout /t %WAIT_SECONDS% /nobreak

goto LOOP

:DONE
echo.
echo [%TIME%] Enrichment complete.
echo.
echo Results:
echo   enriched-books.json  - all books
echo   needs-review.json    - books needing manual review
echo.
pause
