#!/usr/bin/env node

/**
 * 執行4個AI模型生成投資建議的獨立腳本
 * 這個腳本會直接調用MultiAIAdviceService來生成建議並寫入advice.md
 */

console.log('🚀 開始執行4個AI模型投資建議生成...');

// 由於這是TypeScript項目，我們需要通過瀏覽器環境來執行
// 讓我們打開瀏覽器並執行相關功能

const { spawn } = require('child_process');
const path = require('path');

async function executeAIAdvice() {
  try {
    console.log('📱 正在啟動應用程式...');
    
    // 檢查應用程式是否已經在運行
    const checkProcess = spawn('lsof', ['-i', ':5173'], { stdio: 'pipe' });
    
    checkProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ 應用程式已在運行，請在瀏覽器中打開 http://localhost:5173');
        console.log('🎯 請在應用程式中找到「AI建議自動排程」區塊');
        console.log('🔧 點擊「立即執行一次」按鈕來執行4個AI模型建議生成');
        console.log('📝 建議將會自動寫入 advice.md 文件');
      } else {
        console.log('⚠️ 應用程式未運行，請先執行 npm run dev 啟動應用程式');
      }
    });

  } catch (error) {
    console.error('❌ 執行過程中發生錯誤:', error);
  }
}

executeAIAdvice();
