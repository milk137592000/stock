import { UserHoldings, StockSymbol, HoldingDetails } from '../types';

export interface AIModelConfig {
  name: string;
  model: string;
  baseUrl: string;
  apiKey: string;
}

/**
 * 從 warehouse.md 讀取持股資料
 */
export const loadHoldingsFromWarehouse = async (): Promise<UserHoldings> => {
  try {
    const response = await fetch('/warehouse.md');
    if (!response.ok) {
      throw new Error(`無法讀取 warehouse.md: ${response.status}`);
    }

    const content = await response.text();
    const holdings: UserHoldings = {};

    // 解析每一行的持股資料
    const lines = content.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const symbol = parts[0] as StockSymbol;
        const shares = parseInt(parts[1], 10);

        if (!isNaN(shares) && shares > 0) {
          holdings[symbol] = shares;
        }
      }
    }

    return holdings;
  } catch (error) {
    console.error('讀取持股資料失敗:', error);
    // 返回空的持股資料作為備用
    return {};
  }
};

/**
 * 從 warehouse.md 讀取詳細持股資料（包含股票資訊）
 */
export const loadDetailedHoldingsFromWarehouse = async (): Promise<HoldingDetails[]> => {
  try {
    const response = await fetch('/warehouse.md');
    if (!response.ok) {
      throw new Error(`無法讀取 warehouse.md: ${response.status}`);
    }

    const content = await response.text();
    const holdings: HoldingDetails[] = [];

    // 解析每一行的持股資料
    const lines = content.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const parts = line.trim().split(/\t/); // 使用tab分隔

      if (parts.length >= 2) {
        const symbol = parts[0] as StockSymbol;
        const shares = parseInt(parts[1], 10);

        if (!isNaN(shares) && shares > 0) {
          const holding: HoldingDetails = {
            symbol,
            shares,
            name: parts[2] || symbol,
            currentPrice: parts[3] ? parseFloat(parts[3]) : undefined,
            change: parts[4] ? parseFloat(parts[4]) : undefined,
            changePercent: parts[5] ? parseFloat(parts[5]) : undefined,
            lastUpdated: parts[6] || undefined
          };
          holdings.push(holding);
        }
      } else if (parts.length >= 2) {
        // 備用解析：使用空格分隔（舊格式）
        const spaceParts = line.trim().split(/\s+/);
        const symbol = spaceParts[0] as StockSymbol;
        const shares = parseInt(spaceParts[1], 10);

        if (!isNaN(shares) && shares > 0) {
          holdings.push({
            symbol,
            shares,
            name: symbol
          });
        }
      }
    }

    return holdings;
  } catch (error) {
    console.error('讀取詳細持股資料失敗:', error);
    return [];
  }
};

/**
 * 從 api.md 讀取 AI 模型配置
 */
export const loadAIModelsFromConfig = async (): Promise<AIModelConfig[]> => {
  try {
    const response = await fetch('/api.md');
    if (!response.ok) {
      throw new Error(`無法讀取 api.md: ${response.status}`);
    }
    
    const content = await response.text();
    const models: AIModelConfig[] = [];
    
    // 解析 markdown 格式的 AI 模型配置
    const sections = content.split('###').filter(section => section.trim());
    
    for (const section of sections) {
      const lines = section.split('\n').filter(line => line.trim());
      if (lines.length === 0) continue;
      
      const name = lines[0].trim();
      let model = '';
      let baseUrl = '';
      let apiKey = '';
      
      for (const line of lines.slice(1)) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('model=')) {
          model = trimmedLine.replace('model=', '').replace(/"/g, '');
        } else if (trimmedLine.startsWith('base_url=')) {
          baseUrl = trimmedLine.replace('base_url=', '').replace(/"/g, '');
        } else if (trimmedLine.startsWith('api_key')) {
          apiKey = trimmedLine.replace(/api_key\s*=\s*/, '').replace(/"/g, '');
        }
      }
      
      if (name && model && baseUrl && apiKey) {
        models.push({
          name,
          model,
          baseUrl,
          apiKey
        });
      }
    }
    
    return models;
  } catch (error) {
    console.error('讀取 AI 模型配置失敗:', error);
    // 返回空陣列作為備用
    return [];
  }
};

/**
 * 驗證 AI 模型配置是否有效
 */
export const validateAIModelConfig = (config: AIModelConfig): boolean => {
  return !!(config.name && config.model && config.baseUrl && config.apiKey);
};
