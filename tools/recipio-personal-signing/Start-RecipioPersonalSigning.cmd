@echo off
setlocal
set "RECIPIO_PRIVATE_PWSH="
if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe" set "RECIPIO_PRIVATE_PWSH=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe"
if not defined RECIPIO_PRIVATE_PWSH if exist "%ProgramFiles%\PowerShell\7\pwsh.exe" set "RECIPIO_PRIVATE_PWSH=%ProgramFiles%\PowerShell\7\pwsh.exe"
if not defined RECIPIO_PRIVATE_PWSH (
  echo PowerShell 7 is required. No signing action has run.
  pause
  exit /b 1
)
"%RECIPIO_PRIVATE_PWSH%" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-RecipioPersonalSigning.ps1"
exit /b %ERRORLEVEL%
