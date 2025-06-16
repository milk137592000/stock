import { MultiAIAdviceService } from './multiAIAdviceService';

/**
 * 自動排程服務 - 管理定時任務
 */
export class SchedulerService {
  private static scheduledTimeout: NodeJS.Timeout | null = null;
  private static isRunning = false;

  /**
   * 計算下次執行時間（每天早上10點）
   */
  private static getNextExecutionTime(): Date {
    const now = new Date();
    const next = new Date();
    
    // 設定為今天早上10點
    next.setHours(10, 0, 0, 0);
    
    // 如果現在已經過了今天的10點，設定為明天10點
    if (now >= next) {
      next.setDate(next.getDate() + 1);
    }
    
    return next;
  }

  /**
   * 計算距離下次執行的毫秒數
   */
  private static getTimeUntilNextExecution(): number {
    const now = new Date();
    const next = this.getNextExecutionTime();
    return next.getTime() - now.getTime();
  }

  /**
   * 執行AI建議生成任務
   */
  private static async executeTask(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ AI建議生成任務已在運行中，跳過此次執行');
      return;
    }

    this.isRunning = true;
    console.log('🕙 開始執行每日AI建議生成任務...');
    
    try {
      const result = await MultiAIAdviceService.generateAndRecordAllAdvice();
      
      if (result.success) {
        const successCount = result.results.filter(r => r.success).length;
        console.log(`✅ 每日AI建議生成完成: ${successCount}/${result.results.length} 成功`);
        
        // 顯示詳細結果
        result.results.forEach(r => {
          if (r.success) {
            console.log(`  ✅ ${r.modelName}: 成功`);
          } else {
            console.log(`  ❌ ${r.modelName}: ${r.error}`);
          }
        });
      } else {
        console.error('❌ 每日AI建議生成失敗');
        result.results.forEach(r => {
          console.error(`  ❌ ${r.modelName}: ${r.error}`);
        });
      }
    } catch (error) {
      console.error('執行每日AI建議生成任務時發生錯誤:', error);
    } finally {
      this.isRunning = false;
      
      // 排程下次執行
      this.scheduleNext();
    }
  }

  /**
   * 排程下次執行
   */
  private static scheduleNext(): void {
    // 清除現有的排程
    if (this.scheduledTimeout) {
      clearTimeout(this.scheduledTimeout);
    }

    const timeUntilNext = this.getTimeUntilNextExecution();
    const nextExecution = this.getNextExecutionTime();
    
    console.log(`⏰ 下次AI建議生成時間: ${nextExecution.toLocaleString('zh-TW')}`);
    console.log(`⏳ 距離下次執行: ${Math.round(timeUntilNext / 1000 / 60)} 分鐘`);

    this.scheduledTimeout = setTimeout(() => {
      this.executeTask();
    }, timeUntilNext);
  }

  /**
   * 啟動排程服務
   */
  static start(): void {
    console.log('🚀 啟動AI建議自動排程服務...');
    
    // 檢查是否已經啟動
    if (this.scheduledTimeout) {
      console.log('⚠️ 排程服務已在運行中');
      return;
    }

    // 立即檢查是否需要執行（如果現在是10點左右）
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // 如果現在是10:00-10:05之間，立即執行一次
    if (currentHour === 10 && currentMinute <= 5) {
      console.log('🕙 檢測到當前時間接近10點，立即執行一次AI建議生成...');
      this.executeTask();
    } else {
      // 否則排程下次執行
      this.scheduleNext();
    }
  }

  /**
   * 停止排程服務
   */
  static stop(): void {
    console.log('🛑 停止AI建議自動排程服務...');
    
    if (this.scheduledTimeout) {
      clearTimeout(this.scheduledTimeout);
      this.scheduledTimeout = null;
    }
    
    console.log('✅ 排程服務已停止');
  }

  /**
   * 手動執行一次AI建議生成
   */
  static async executeNow(): Promise<void> {
    console.log('🔧 手動執行AI建議生成...');
    await this.executeTask();
  }

  /**
   * 獲取排程狀態
   */
  static getStatus(): {
    isScheduled: boolean;
    isRunning: boolean;
    nextExecution: string | null;
    timeUntilNext: number | null;
  } {
    const nextExecution = this.scheduledTimeout ? this.getNextExecutionTime() : null;
    const timeUntilNext = this.scheduledTimeout ? this.getTimeUntilNextExecution() : null;

    return {
      isScheduled: !!this.scheduledTimeout,
      isRunning: this.isRunning,
      nextExecution: nextExecution ? nextExecution.toLocaleString('zh-TW') : null,
      timeUntilNext: timeUntilNext ? Math.round(timeUntilNext / 1000 / 60) : null // 分鐘
    };
  }

  /**
   * 測試功能 - 設定較短的間隔進行測試
   */
  static startTestMode(intervalMinutes: number = 2): void {
    console.log(`🧪 啟動測試模式，每 ${intervalMinutes} 分鐘執行一次...`);
    
    // 停止現有排程
    this.stop();
    
    // 立即執行一次
    this.executeTask();
    
    // 設定測試間隔
    this.scheduledTimeout = setInterval(() => {
      this.executeTask();
    }, intervalMinutes * 60 * 1000);
  }
}
