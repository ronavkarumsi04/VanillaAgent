@echo off
rem ─────────────────────────────────────────────────────────────
rem  VanillaAgent — Web GUI launcher (Windows)
rem  Starts the sovereign runtime and opens http://localhost:3000
rem ─────────────────────────────────────────────────────────────
setlocal enabledelayedexpansion
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

if not defined PORT if defined METRICS_PORT set "PORT=%METRICS_PORT%"
if not defined PORT set "PORT=3000"

echo.
echo   VanillaAgent v@@VERSION@@  - Sovereign Node
echo.
echo     Dashboard    http://localhost:%PORT%
echo     State        %USERPROFILE%\.vanilla-agent
echo     Stop         Ctrl+C in this window
echo.

rem Open the dashboard as soon as the runtime reports healthy
start "" /b node "%ROOT%\lib\open-browser.mjs" --port %PORT%

set "PORT=%PORT%"
node "%ROOT%\lib\bootstrap.mjs" core --run %*
endlocal & exit /b %ERRORLEVEL%
