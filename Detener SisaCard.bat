@echo off
rem Doble clic para apagar SisaCard.
title Detener SisaCard
chcp 65001 >nul
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0infra\stop.ps1"
echo.
pause
