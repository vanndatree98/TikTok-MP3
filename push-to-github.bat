@echo off
chcp 65001 >nul
title Push to GitHub - vanndatree98/TikTok-MP3
echo ===================================================
echo   🚀 កំពុងភ្ជាប់ និង Push កូដទៅកាន់ GitHub...
echo   Repository: https://github.com/vanndatree98/TikTok-MP3
echo ===================================================
echo.

cd /d "%~dp0"

echo [1/3] ពិនិត្យ Git Status...
git status --short

echo.
echo [2/3] បញ្ចូលកូដថ្មីៗ និង Commit...
git add .
git commit -m "update: TikTok MP3 & Short Drama Downloader" >nul 2>&1

echo.
echo [3/3] កំពុងរុញទិន្នន័យ (Push) ទៅកាន់ GitHub main branch...
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===================================================
    echo   ✅ ជោគជ័យ! កូដត្រូវបាន Push ទៅ GitHub រួចរាល់!
    echo   តំណភ្ជាប់: https://github.com/vanndatree98/TikTok-MP3
    echo ===================================================
    start https://github.com/vanndatree98/TikTok-MP3
) else (
    echo.
    echo ===================================================
    echo   ⚠️ Repository មិនទាន់មាននៅលើ GitHub ឡើយ!
    echo   កំពុងបើកទំព័រដើម្បីបង្កើត Repository ថ្មី...
    echo ===================================================
    start https://github.com/new?name=TikTok-MP3^&description=TikTok+MP3+and+Short+Drama+Downloader
    echo.
    echo ជំហានងាយៗ:
    echo 1. ចុចប៊ូតុង "Create repository" លើ Browser (កុំធីក Add README)
    echo 2. រួចចុច Enter ក្នុងផ្ទាំងនេះ ដើម្បី Push ម្តងទៀត!
    echo.
    pause
    echo កំពុង Push ម្តងទៀត...
    git push -u origin main
)

echo.
pause
