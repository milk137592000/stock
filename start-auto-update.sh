#!/bin/bash

# 自動更新服務啟動腳本

echo "🚀 啟動 Warehouse 自動更新服務..."

# 檢查 Node.js 是否安裝
if ! command -v node &> /dev/null; then
    echo "❌ 錯誤: Node.js 未安裝"
    echo "請先安裝 Node.js: https://nodejs.org/"
    exit 1
fi

# 檢查 npm 是否安裝
if ! command -v npm &> /dev/null; then
    echo "❌ 錯誤: npm 未安裝"
    exit 1
fi

# 進入 server 目錄
cd server

# 檢查 package.json 是否存在
if [ ! -f "package.json" ]; then
    echo "❌ 錯誤: 找不到 package.json"
    exit 1
fi

# 安裝依賴
echo "📦 安裝依賴..."
npm install

# 檢查安裝是否成功
if [ $? -ne 0 ]; then
    echo "❌ 依賴安裝失敗"
    exit 1
fi

echo "✅ 依賴安裝完成"

# 啟動服務
echo "🚀 啟動 Warehouse Updater Service..."
echo "📁 監控檔案: $(pwd)/../warehouse.md"
echo "🌐 服務地址: http://localhost:3001"
echo ""
echo "按 Ctrl+C 停止服務"
echo "=========================="

npm start
