@echo off
rem ─────────────────────────────────────────────────────────────
rem  VanillaAgent — sovereign runtime launcher (Windows)
rem    vanilla --run      start the agent + Web GUI dashboard
rem    vanilla --status   show agent health
rem    vanilla --help     runtime options
rem ─────────────────────────────────────────────────────────────
setlocal
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

node "%ROOT%\lib\bootstrap.mjs" core %*
endlocal & exit /b %ERRORLEVEL%
