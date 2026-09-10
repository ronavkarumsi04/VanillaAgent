@echo off
rem ─────────────────────────────────────────────────────────────
rem  VanillaAgent — uninstaller (Windows)
rem  Removes the installed runtime, shortcuts and Start Menu entry.
rem ─────────────────────────────────────────────────────────────
setlocal enabledelayedexpansion
set "ROOT=%~dp0.."
for %%i in ("%ROOT%") do set "ROOT=%%~fi"

echo.
echo   VanillaAgent Uninstaller
echo.
echo     Install location  %ROOT%
echo.

set "CONFIRM="
set /p "CONFIRM=  Remove VanillaAgent? [y/N] "
if /i not "%CONFIRM%"=="y" (
  echo   Aborted.
  exit /b 0
)

echo   Stopping running instances...
taskkill /FI "WINDOWTITLE eq VanillaAgent*" /T /F >nul 2>&1

set "STARTMENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs\VanillaAgent"
if exist "%STARTMENU%" rmdir /s /q "%STARTMENU%"
if exist "%USERPROFILE%\Desktop\VanillaAgent.lnk" del /f /q "%USERPROFILE%\Desktop\VanillaAgent.lnk"

if exist "%ROOT%" rmdir /s /q "%ROOT%"

echo.
echo   VanillaAgent uninstalled.
echo.
endlocal
