@echo off
rem ─────────────────────────────────────────────────────────────
rem  VanillaAgent — creator ^& developer CLI (Windows)
rem    vanilla-cli status ^| doctor ^| logs ^| memory ^| dashboard
rem ─────────────────────────────────────────────────────────────
setlocal
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

node "%ROOT%\lib\bootstrap.mjs" cli %*
endlocal & exit /b %ERRORLEVEL%
