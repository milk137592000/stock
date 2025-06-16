/**
 * Warehouse API 服務 - 與後端服務通信來自動更新 warehouse.md
 */

const API_BASE_URL = 'http://localhost:3001/api';

export interface WarehouseApiResponse {
  success: boolean;
  content?: string;
  message?: string;
  error?: string;
  backupPath?: string;
  backups?: string[];
}

export class WarehouseApiService {
  /**
   * 檢查後端服務是否運行
   */
  static async checkServiceHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      const data: WarehouseApiResponse = await response.json();
      return data.success;
    } catch (error) {
      console.warn('Warehouse API 服務未運行:', error);
      return false;
    }
  }

  /**
   * 讀取 warehouse.md 檔案內容
   */
  static async readWarehouseFile(): Promise<string | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/warehouse`);
      const data: WarehouseApiResponse = await response.json();
      
      if (data.success && data.content) {
        return data.content;
      } else {
        throw new Error(data.error || '讀取檔案失敗');
      }
    } catch (error) {
      console.error('讀取 warehouse.md 失敗:', error);
      return null;
    }
  }

  /**
   * 自動更新 warehouse.md 檔案
   */
  static async updateWarehouseFile(content: string): Promise<WarehouseApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/warehouse/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      const data: WarehouseApiResponse = await response.json();
      
      if (data.success) {
        console.log('✅ warehouse.md 已自動更新');
        if (data.backupPath) {
          console.log(`📁 備份檔案: ${data.backupPath}`);
        }
      } else {
        console.error('❌ 更新失敗:', data.error);
      }

      return data;
    } catch (error) {
      console.error('更新 warehouse.md 失敗:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知錯誤'
      };
    }
  }

  /**
   * 獲取備份檔案列表
   */
  static async getBackupFiles(): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/warehouse/backups`);
      const data: WarehouseApiResponse = await response.json();
      
      return data.success && data.backups ? data.backups : [];
    } catch (error) {
      console.error('獲取備份列表失敗:', error);
      return [];
    }
  }

  /**
   * 完整的自動更新流程
   * 1. 檢查服務狀態
   * 2. 更新檔案
   * 3. 返回結果
   */
  static async performAutoUpdate(content: string): Promise<{
    success: boolean;
    message: string;
    usesFallback: boolean;
  }> {
    // 檢查後端服務是否可用
    const serviceAvailable = await this.checkServiceHealth();
    
    if (!serviceAvailable) {
      return {
        success: false,
        message: '後端服務未運行，請啟動 Warehouse Updater Service',
        usesFallback: true
      };
    }

    // 執行自動更新
    const result = await this.updateWarehouseFile(content);
    
    if (result.success) {
      return {
        success: true,
        message: `✅ warehouse.md 已自動更新！${result.backupPath ? ' (已自動備份)' : ''}`,
        usesFallback: false
      };
    } else {
      return {
        success: false,
        message: `❌ 自動更新失敗: ${result.error}`,
        usesFallback: true
      };
    }
  }
}

/**
 * 檢查是否支援自動更新
 */
export const isAutoUpdateSupported = async (): Promise<boolean> => {
  return await WarehouseApiService.checkServiceHealth();
};
