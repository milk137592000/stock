import { InvestmentAdvice, RecommendedStock } from '../types';
import { WarehouseApiService } from './warehouseApiService';

export interface AdviceRecord {
  date: string;
  modelName: string;
  marketOutlook: string;
  existingHoldingsActions: RecommendedStock[];
  newStockSuggestions: RecommendedStock[];
  budgetSummary: {
    decidedOptimalInvestmentNTD: number;
    totalAllocated: number;
  };
}

/**
 * 建議記錄服務 - 管理 advice.md 文件
 */
export class AdviceRecordService {
  private static readonly ADVICE_FILE_PATH = '/Users/eugenefang/Desktop/code/inventment/advice.md';
  private static readonly API_BASE_URL = 'http://localhost:3001/api';

  /**
   * 檢查建議是否有實際的買/賣動作
   */
  private static hasActionableAdvice(advice: InvestmentAdvice): boolean {
    // 檢查現有持股是否有買/賣建議 (排除HOLD)
    const hasExistingActions = advice.existingHoldingsRecommendations.some(
      stock => stock.action === 'BUY' || stock.action === 'SELL'
    );

    // 檢查是否有新股建議 (未在持有股中的建議購入股票)
    const hasNewSuggestions = advice.newSuggestions.length > 0;

    return hasExistingActions || hasNewSuggestions;
  }

  /**
   * 過濾出有動作的建議
   */
  private static filterActionableRecommendations(recommendations: RecommendedStock[]): RecommendedStock[] {
    return recommendations.filter(stock => stock.action === 'BUY' || stock.action === 'SELL');
  }

  /**
   * 格式化建議記錄為 Markdown
   */
  private static formatAdviceRecord(record: AdviceRecord): string {
    const { date, modelName, marketOutlook, existingHoldingsActions, newStockSuggestions, budgetSummary } = record;

    let markdown = `## ${date} - ${modelName}\n\n`;

    // 市場展望
    markdown += `### 📊 市場展望\n${marketOutlook}\n\n`;

    // 預算摘要
    markdown += `### 💰 預算摘要\n`;
    markdown += `- **AI判斷投資金額**: NT$ ${budgetSummary.decidedOptimalInvestmentNTD.toLocaleString()} (範圍: 1,000-20,000)\n`;
    markdown += `- **實際分配金額**: NT$ ${budgetSummary.totalAllocated.toLocaleString()}\n\n`;

    // 現有持股建議（只顯示買/賣建議，排除HOLD）
    if (existingHoldingsActions.length > 0) {
      markdown += `### 🔄 持有股票建議\n`;
      existingHoldingsActions.forEach(stock => {
        const action = stock.action === 'BUY' ? '買入' : '賣出';
        const actionIcon = stock.action === 'BUY' ? '📈' : '📉';
        markdown += `- ${actionIcon} **${stock.symbol} (${stock.name})**: ${action} ${stock.recommendedShares} 股\n`;
        markdown += `  - 現價: NT$ ${stock.currentPrice}\n`;
        markdown += `  - 金額: NT$ ${stock.allocatedAmount.toLocaleString()}\n`;
        markdown += `  - 理由: ${stock.reasoning}\n\n`;
      });
    }

    // 新股建議（未在持有股中的建議購入股票）
    if (newStockSuggestions.length > 0) {
      markdown += `### 🆕 建議購入新股\n`;
      newStockSuggestions.forEach(stock => {
        markdown += `- 📈 **${stock.symbol} (${stock.name})**: 買入 ${stock.recommendedShares} 股\n`;
        markdown += `  - 現價: NT$ ${stock.currentPrice}\n`;
        markdown += `  - 金額: NT$ ${stock.allocatedAmount.toLocaleString()}\n`;
        markdown += `  - 理由: ${stock.reasoning}\n\n`;
      });
    }

    markdown += `---\n\n`;
    return markdown;
  }

  /**
   * 讀取現有的 advice.md 內容
   */
  private static async readAdviceFile(): Promise<string> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/advice`);
      if (response.ok) {
        const data = await response.json();
        return data.content || '';
      }
      return '';
    } catch (error) {
      console.warn('讀取 advice.md 失敗，將創建新文件:', error);
      return '';
    }
  }

  /**
   * 更新 advice.md 文件
   */
  private static async updateAdviceFile(content: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/advice/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('更新 advice.md 失敗:', error);
      return false;
    }
  }

  /**
   * 記錄AI建議到 advice.md
   */
  static async recordAdvice(
    modelName: string,
    advice: InvestmentAdvice
  ): Promise<boolean> {
    try {
      // 檢查是否有可執行的建議
      if (!this.hasActionableAdvice(advice)) {
        console.log(`${modelName} 沒有可執行的建議，跳過記錄`);
        return true;
      }

      // 過濾出有動作的建議
      const existingHoldingsActions = this.filterActionableRecommendations(
        advice.existingHoldingsRecommendations
      );

      // 創建建議記錄
      const record: AdviceRecord = {
        date: new Date().toLocaleDateString('zh-TW', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          weekday: 'short'
        }),
        modelName,
        marketOutlook: advice.marketOutlook,
        existingHoldingsActions,
        newStockSuggestions: advice.newSuggestions,
        budgetSummary: {
          decidedOptimalInvestmentNTD: advice.decidedOptimalInvestmentNTD,
          totalAllocated: existingHoldingsActions.reduce((sum, stock) => sum + stock.allocatedAmount, 0) +
                          advice.newSuggestions.reduce((sum, stock) => sum + stock.allocatedAmount, 0)
        }
      };

      // 格式化為 Markdown
      const newContent = this.formatAdviceRecord(record);

      // 讀取現有內容
      const existingContent = await this.readAdviceFile();

      // 檢查今天是否已有此模型的記錄
      const today = record.date;
      const existingRecordPattern = new RegExp(`## ${today} - ${modelName}`, 'g');
      
      let updatedContent: string;
      if (existingRecordPattern.test(existingContent)) {
        // 替換現有記錄
        const sectionPattern = new RegExp(
          `## ${today} - ${modelName}[\\s\\S]*?(?=## |$)`,
          'g'
        );
        updatedContent = existingContent.replace(sectionPattern, newContent);
      } else {
        // 添加新記錄到文件開頭
        updatedContent = newContent + existingContent;
      }

      // 更新文件
      const success = await this.updateAdviceFile(updatedContent);
      
      if (success) {
        console.log(`✅ ${modelName} 建議已記錄到 advice.md`);
      } else {
        console.error(`❌ ${modelName} 建議記錄失敗`);
      }

      return success;
    } catch (error) {
      console.error(`記錄 ${modelName} 建議時發生錯誤:`, error);
      return false;
    }
  }

  /**
   * 清理舊記錄（保留最近30天）
   */
  static async cleanupOldRecords(): Promise<void> {
    try {
      const content = await this.readAdviceFile();
      if (!content) return;

      const lines = content.split('\n');
      const filteredLines: string[] = [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let currentSection = '';
      let keepCurrentSection = true;

      for (const line of lines) {
        if (line.startsWith('## ')) {
          // 新的日期區段
          const dateMatch = line.match(/## (\d{4}\/\d{2}\/\d{2})/);
          if (dateMatch) {
            const recordDate = new Date(dateMatch[1]);
            keepCurrentSection = recordDate >= thirtyDaysAgo;
          }
          currentSection = line;
        }

        if (keepCurrentSection) {
          filteredLines.push(line);
        }
      }

      const cleanedContent = filteredLines.join('\n');
      await this.updateAdviceFile(cleanedContent);
      console.log('✅ 已清理30天前的舊記錄');
    } catch (error) {
      console.error('清理舊記錄失敗:', error);
    }
  }
}
