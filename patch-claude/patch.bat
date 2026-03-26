@echo off
:: patch.bat — double-click to patch Herd's Integrations tab
:: Adds "Claude Code" row alongside Laravel Forge
::
:: Requires: Node.js (npx), PowerShell 5.1+
:: Admin/UAC prompt will appear to replace app.asar

echo.
echo  laravel-herd-mcp - Herd UI Patcher
echo  -----------------------------------

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: Node.js not found.
    echo  Download from https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: Run the PowerShell patch script
powershell -ExecutionPolicy Bypass -File "%~dp0patch.ps1"

if %errorlevel% neq 0 (
    echo.
    echo  Patch failed. See errors above.
    pause
    exit /b 1
)

pause
