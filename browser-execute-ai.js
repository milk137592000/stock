/**
 * 在瀏覽器控制台中執行此腳本來觸發4個AI模型建議生成
 * 
 * 使用方法：
 * 1. 打開瀏覽器開發者工具 (F12)
 * 2. 切換到 Console 標籤
 * 3. 複製並貼上此腳本
 * 4. 按 Enter 執行
 */

console.log('🚀 開始執行4個AI模型投資建議生成...');

// 檢查是否在正確的應用程式環境中
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  
  // 嘗試找到並點擊「立即執行一次」按鈕
  function findAndClickExecuteButton() {
    // 查找包含「立即執行一次」文字的按鈕
    const buttons = Array.from(document.querySelectorAll('button'));
    const executeButton = buttons.find(btn => 
      btn.textContent && btn.textContent.includes('立即執行一次')
    );
    
    if (executeButton) {
      console.log('✅ 找到「立即執行一次」按鈕，正在點擊...');
      executeButton.click();
      return true;
    } else {
      console.log('❌ 未找到「立即執行一次」按鈕');
      return false;
    }
  }
  
  // 嘗試直接調用 SchedulerService (如果可用)
  function tryDirectExecution() {
    try {
      // 檢查是否可以訪問 SchedulerService
      if (typeof SchedulerService !== 'undefined') {
        console.log('🔧 直接調用 SchedulerService.executeNow()...');
        SchedulerService.executeNow();
        return true;
      } else {
        console.log('⚠️ SchedulerService 不可用，嘗試其他方法...');
        return false;
      }
    } catch (error) {
      console.error('❌ 直接執行失敗:', error);
      return false;
    }
  }
  
  // 主執行邏輯
  function executeAIAdvice() {
    console.log('🎯 正在嘗試執行AI建議生成...');
    
    // 方法1: 嘗試直接調用服務
    if (tryDirectExecution()) {
      console.log('✅ 使用直接調用方式執行');
      return;
    }
    
    // 方法2: 嘗試點擊按鈕
    if (findAndClickExecuteButton()) {
      console.log('✅ 使用按鈕點擊方式執行');
      return;
    }
    
    // 方法3: 提供手動指引
    console.log('📋 請手動執行以下步驟：');
    console.log('1. 在頁面中找到「AI建議自動排程」區塊');
    console.log('2. 點擊「立即執行一次」按鈕');
    console.log('3. 等待執行完成，建議將自動寫入 advice.md 文件');
  }
  
  // 延遲執行，確保頁面完全載入
  setTimeout(executeAIAdvice, 1000);
  
} else {
  console.error('❌ 請在正確的應用程式頁面 (localhost:5173) 中執行此腳本');
}

console.log('📝 執行完成後，建議將會寫入 advice.md 文件');
console.log('🔍 您可以檢查控制台輸出來查看執行狀態');
