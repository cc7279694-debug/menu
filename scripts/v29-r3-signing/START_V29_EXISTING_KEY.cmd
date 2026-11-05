@echo off
if not exist "C:\Users\CDD\AppData\Local\Programs\Python\Python312\pythonw.exe" exit /b 1
start "" "C:\Users\CDD\AppData\Local\Programs\Python\Python312\pythonw.exe" -X utf8 "%~dp0sign_existing.py"
