@echo off
chcp 65001 >nul
cd /d "%~dp0"
"C:\Users\CDD\AppData\Local\Programs\Python\Python312\python.exe" -X utf8 "%~dp0sign_release.py"
echo.
pause
