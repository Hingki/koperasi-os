@echo off
setlocal

:: ==========================================
:: KOPERASI OS - DATABASE BACKUP SCRIPT
:: ==========================================

:: Configuration
:: Hardcoded from .env for the drill purpose (In production, read from env)
set DB_URL=postgresql://postgres:Koperasi2004@db.jppyqrxoswkhlnzuokwm.supabase.co:5432/postgres
set BACKUP_DIR=backups

:: 1. Prepare Directory
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: 2. Generate Timestamp (YYYYMMDD_HHMMSS)
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%
set FILENAME=%BACKUP_DIR%\backup_%TIMESTAMP%.sql

echo ==========================================
echo [INFO] STARTING BACKUP
echo [INFO] Time: %TIMESTAMP%
echo [INFO] Target File: %FILENAME%
echo ==========================================

:: 3. Execute Dump
:: We use --clean --if-exists to ensure a clean restore
:: We use --no-owner --no-acl because Supabase managed roles might differ
echo [EXEC] Running pg_dump...

pg_dump "%DB_URL%" -f "%FILENAME%" --clean --if-exists --no-owner --no-acl

:: 4. Check Status
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Backup created successfully!
    echo [LOCATION] %CD%\%FILENAME%
    echo.
    echo To restore this backup, use:
    echo psql "%DB_URL%" -f "%FILENAME%"
) else (
    echo.
    echo [ERROR] Backup Failed!
    echo Possible causes:
    echo 1. Internet connection lost
    echo 2. pg_dump is not in system PATH
    echo 3. Database password changed
)

echo ==========================================
pause
endlocal
