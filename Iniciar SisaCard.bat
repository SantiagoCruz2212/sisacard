@echo off
rem Doble clic para levantar SisaCard (frontend + backend) y ver la IP para las demas PCs.
title SisaCard
chcp 65001 >nul
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0infra\start.ps1"
echo.
pause
