@echo off
chcp 65001 > nul
echo 回退到 checkpoint 2026-06-24...
echo.

xcopy /Y /E "%~dp0_checkpoint-20260624\src" "%~dp0src\" > nul 2>&1
if %errorlevel% equ 0 ( echo [OK] src/ ) else ( echo [FAIL] src/ )

xcopy /Y /E "%~dp0_checkpoint-20260624\lib" "%~dp0lib\" > nul 2>&1
if %errorlevel% equ 0 ( echo [OK] lib/ ) else ( echo [FAIL] lib/ )

xcopy /Y /E "%~dp0_checkpoint-20260624\ui" "%~dp0ui\" > nul 2>&1
if %errorlevel% equ 0 ( echo [OK] ui/ ) else ( echo [FAIL] ui/ )

xcopy /Y /E "%~dp0_checkpoint-20260624\craft" "%~dp0craft\" > nul 2>&1
if %errorlevel% equ 0 ( echo [OK] craft/ ) else ( echo [FAIL] craft/ )

xcopy /Y "%~dp0_checkpoint-20260624\taxonomy.json" "%~dp0taxonomy.json" > nul 2>&1
if %errorlevel% equ 0 ( echo [OK] taxonomy.json ) else ( echo [FAIL] taxonomy.json )

xcopy /Y "%~dp0_checkpoint-20260624\package.json" "%~dp0package.json" > nul 2>&1
if %errorlevel% equ 0 ( echo [OK] package.json ) else ( echo [FAIL] package.json )

echo.
echo === 回退完成 ===
echo 运行 node src/server.js 启动服务器
pause
