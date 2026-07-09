@echo off
cd /d "%~dp0"
taskkill /f /im pythonw.exe >nul 2>&1
taskkill /f /im python.exe >nul 2>&1
start "" "python_embed\pythonw.exe" src\main.py
exit
