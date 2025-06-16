@echo off
chcp 65001 >nul

echo 🚀 啟動 Warehouse 自動更新服務...

REM 檢查 Node.js 是否安裝
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 錯誤: Node.js 未安裝
    echo 請先安裝 Node.js: https://nodejs.org/
    pause
    exit /b 1
)

REM 檢查 npm 是否安裝
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 錯誤: npm 未安裝
    pause
    exit /b 1
)

REM 進入 server 目錄
cd server

REM 檢查 package.json 是否存在
if not exist "package.json" (
    echo ❌ 錯誤: 找不到 package.json
    pause
    exit /b 1
)

REM 安裝依賴
echo 📦 安裝依賴...
npm install

REM 檢查安裝是否成功
if %errorlevel% neq 0 (
    echo ❌ 依賴安裝失敗
    pause
    exit /b 1
)

echo ✅ 依賴安裝完成

REM 啟動服務
echo 🚀 啟動 Warehouse Updater Service...
echo 📁 監控檔案: %cd%\..\warehouse.md
echo 🌐 服務地址: http://localhost:3001
echo.
echo 按 Ctrl+C 停止服務
echo ==========================
echo.

npm start

pause
