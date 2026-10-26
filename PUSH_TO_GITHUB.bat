@echo off
title Push Credit Bank to GitHub
echo ======================================================
echo   Pushing Credit Bank 2570 to GitHub...
echo ======================================================
echo.

cd /d "h:\My Drive\สำรวจ Credit Bank ปีงบ 2570"
"C:\Program Files\Git\cmd\git.exe" add -A
"C:\Program Files\Git\cmd\git.exe" commit -m "update: automated sync"
"C:\Program Files\Git\cmd\git.exe" push origin main

echo.
echo ======================================================
echo   Done! Synced with GitHub and Vercel!
echo ======================================================
pause
