@echo off
title TikTok & Douyin Downloader Server
cd /d "%~dp0"
echo ========================================================
echo   Starting Remix Social Video & MP3 Downloader...
echo   Opening browser at http://localhost:3000
echo ========================================================

:: Wait 2 seconds then launch browser
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"

:: Start the server
npm.cmd run dev
if %errorlevel% neq 0 (
  echo.
  echo Server stopped or encountered an error.
  pause
)
