/**
 * Google Docs 集成服務
 * 將 advice.md 和 warehouse.md 同步到 Google Docs
 */

export interface GoogleDocsConfig {
  warehouseDocumentId: string;
  adviceDocumentId: string;
  apiKey: string;
}

export interface WarehouseRow {
  symbol: string;
  shares: number;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
}

export interface AdviceEntry {
  date: string;
  model: string;
  marketOutlook: string;
  investmentAmount: number;
  allocatedAmount: number;
  recommendations: string;
}

export class GoogleDocsService {
  private config: GoogleDocsConfig;

  constructor(config: GoogleDocsConfig) {
    this.config = config;
  }

  /**
   * 格式化 warehouse.md 內容為 Google Docs 格式
   */
  static formatWarehouseForDocs(content: string): string {
    const lines = content.trim().split('\n').filter(line => line.trim());

    let formatted = '📊 投資組合持股明細\n';
    formatted += '更新時間: ' + new Date().toLocaleString('zh-TW') + '\n\n';
    formatted += '股票代號\t持股數量\t股票名稱\t\t現價\t漲跌\t漲跌%\t更新時間\n';
    formatted += '='.repeat(80) + '\n';

    lines.forEach(line => {
      const parts = line.split('\t');
      if (parts.length >= 7) {
        formatted += `${parts[0]}\t${parts[1]}\t${parts[2]}\t\t${parts[3]}\t${parts[4]}\t${parts[5]}\t${parts[6]}\n`;
      }
    });

    return formatted;
  }

  /**
   * 格式化 advice.md 內容為 Google Docs 格式
   */
  static formatAdviceForDocs(content: string): string {
    // 保持原始 markdown 格式，但稍作調整以適應 Google Docs
    let formatted = '🤖 AI 投資建議記錄\n';
    formatted += '更新時間: ' + new Date().toLocaleString('zh-TW') + '\n\n';
    formatted += '='.repeat(60) + '\n\n';

    // 保持原始內容，只做基本的格式調整
    formatted += content
      .replace(/#{1,6}\s*/g, '') // 移除 markdown 標題標記
      .replace(/\*\*(.*?)\*\*/g, '$1') // 移除粗體標記
      .replace(/---+/g, '\n' + '='.repeat(50) + '\n') // 分隔線
      .trim();

    return formatted;
  }

  /**
   * 更新 Warehouse Google Doc
   */
  async updateWarehouseDocument(warehouseContent: string): Promise<boolean> {
    try {
      const formattedContent = GoogleDocsService.formatWarehouseForDocs(warehouseContent);

      const response = await fetch(
        `https://docs.googleapis.com/v1/documents/${this.config.warehouseDocumentId}:batchUpdate?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                deleteContentRange: {
                  range: {
                    startIndex: 1,
                    endIndex: -1
                  }
                }
              },
              {
                insertText: {
                  location: {
                    index: 1
                  },
                  text: formattedContent
                }
              }
            ]
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Google Docs API 錯誤: ${response.status} ${response.statusText}`);
      }

      console.log('✅ Warehouse Google Doc 更新成功');
      return true;
    } catch (error) {
      console.error('❌ 更新 Warehouse Google Doc 失敗:', error);
      return false;
    }
  }

  /**
   * 更新 Google Docs (advice.md 內容)
   */
  async updateAdviceDocument(adviceContent: string): Promise<boolean> {
    try {
      // 格式化內容為 Google Docs 格式
      const formattedContent = this.formatAdviceForDocs(adviceContent);

      const response = await fetch(
        `https://docs.googleapis.com/v1/documents/${this.config.adviceDocumentId}:batchUpdate?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                deleteContentRange: {
                  range: {
                    startIndex: 1,
                    endIndex: -1
                  }
                }
              },
              {
                insertText: {
                  location: {
                    index: 1
                  },
                  text: formattedContent
                }
              }
            ]
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Google Docs API 錯誤: ${response.status} ${response.statusText}`);
      }

      console.log('✅ Google Docs 更新成功');
      return true;
    } catch (error) {
      console.error('❌ 更新 Google Docs 失敗:', error);
      return false;
    }
  }

  /**
   * 格式化 advice 內容為 Google Docs 格式
   */
  private formatAdviceForDocs(content: string): string {
    // 移除 markdown 格式標記，保持可讀性
    return content
      .replace(/#{1,6}\s*/g, '') // 移除標題標記
      .replace(/\*\*(.*?)\*\*/g, '$1') // 移除粗體標記
      .replace(/\*(.*?)\*/g, '$1') // 移除斜體標記
      .replace(/`(.*?)`/g, '$1') // 移除代碼標記
      .replace(/---+/g, '\n' + '='.repeat(50) + '\n') // 分隔線
      .trim();
  }

  /**
   * 同步所有數據到 Google Docs
   */
  async syncAllData(warehouseContent: string, adviceContent: string): Promise<{
    warehouseSuccess: boolean;
    adviceSuccess: boolean;
  }> {
    console.log('🔄 開始同步數據到 Google Docs...');

    const warehouseSuccess = await this.updateWarehouseDocument(warehouseContent);
    const adviceSuccess = await this.updateAdviceDocument(adviceContent);

    console.log(`📊 同步完成: Warehouse ${warehouseSuccess ? '✅' : '❌'}, Advice ${adviceSuccess ? '✅' : '❌'}`);

    return {
      warehouseSuccess,
      adviceSuccess
    };
  }
}

/**
 * 創建 Google Docs 服務實例
 */
export const createGoogleDocsService = (config: GoogleDocsConfig): GoogleDocsService => {
  return new GoogleDocsService(config);
};
