# 完整數據流程說明

## 🔄 數據流程概述

您提到的順序：**爬蟲 → 更新 warehouse.md → 讀取 warehouse.md → 更新卡片資訊**

這個流程現在已經完全實現並優化！

## 📊 詳細流程步驟

### Step 1: 爬蟲獲取股票資料
**位置**: `services/stockCrawlerService.ts`
```typescript
// 批量爬取股票資訊
const stockInfos = await StockCrawlerService.fetchMultipleStocks(symbols);
```

**功能**:
- 從 Yahoo 股市爬取即時股票資訊
- 包含：股票名稱、現價、漲跌金額、漲跌百分比
- 如果爬取失敗，自動使用智能模擬資料

### Step 2: 更新 warehouse.md
**位置**: `services/stockCrawlerService.ts` - `autoUpdateWarehouseContent()`
```typescript
// 生成新的warehouse.md內容
const updatedContent = symbols.map(symbol => {
  const stockInfo = stockInfos.find(info => info.symbol === symbol);
  return `${symbol}\t${shares}\t${stockInfo.name}\t${stockInfo.currentPrice.toFixed(2)}\t${stockInfo.change.toFixed(2)}\t${stockInfo.changePercent.toFixed(2)}\t${stockInfo.lastUpdated}`;
}).join('\n');
```

**功能**:
- 格式化爬取的資料為 warehouse.md 格式
- 使用 Tab 分隔符確保正確解析
- 包含完整的股票資訊（代號、持股、名稱、現價、漲跌、時間）

### Step 3: 讀取 warehouse.md
**位置**: `App.tsx` - `handleWarehouseUpdated()`
```typescript
// 解析新的warehouse內容
const lines = newContent.split('\n').filter(line => line.trim());
const updatedHoldings: UserHoldings = {};
const updatedStocksMap: { [key: string]: StockDetails } = {};

for (const line of lines) {
  const parts = line.trim().split(/\t/);
  if (parts.length >= 2) {
    const symbol = parts[0] as StockSymbol;
    const shares = parseInt(parts[1], 10);
    
    updatedHoldings[symbol] = shares;
    updatedStocksMap[symbol] = {
      name: parts[2] || symbol,
      category: 'TW Stock',
      currentPrice: parts[3] ? parseFloat(parts[3]) : 0
    };
  }
}
```

**功能**:
- 解析更新後的 warehouse.md 內容
- 提取持股數量和股票詳細資訊
- 更新應用程式的內部狀態

### Step 4: 更新卡片資訊
**位置**: `App.tsx` - 狀態更新
```typescript
// 更新狀態
setUserHoldings(updatedHoldings);
setCurrentAllStocksMap(updatedStocksMap);
```

**功能**:
- 更新 `userHoldings` (持股數量)
- 更新 `currentAllStocksMap` (股票詳細資訊，包含現價)
- 個股卡片自動重新渲染顯示最新資訊

## 🎯 雙重更新機制

為了確保資料一致性，我們實現了雙重更新機制：

### 1. 立即更新 (即時反應)
```typescript
// 通知父組件資料已更新（立即更新卡片）
if (onDataUpdated) {
  onDataUpdated(finalStockInfos);
}
```
- 爬取完成後立即更新卡片資訊
- 用戶無需等待，立即看到最新資料

### 2. 同步更新 (確保一致性)
```typescript
// 通知父組件warehouse內容已更新
if (onWarehouseUpdated) {
  onWarehouseUpdated(updatedWarehouseContent);
}
```
- 同時更新內部狀態以保持與 warehouse.md 一致
- 確保重新載入頁面時資料正確

## 📁 檔案更新方式

### 當前實現
- **下載新檔案**: 自動生成並下載更新後的 warehouse.md
- **內容同步**: 應用程式內部狀態與新內容同步
- **手動替換**: 用戶可以選擇用下載的檔案替換原 warehouse.md

### 檔案格式
```
006208	289	富邦台50	110.25	0.35	0.32	2025-06-16T18:40:00.000Z
00713	1133	元大台灣高息低波	51.90	0.10	0.19	2025-06-16T18:40:00.000Z
00878	1572	國泰永續高股息	20.86	0.02	0.10	2025-06-16T18:40:00.000Z
```

**欄位說明**:
1. 股票代號
2. 持股數量  
3. 股票名稱
4. 現價
5. 今日波動金額
6. 今日波動百分比
7. 最後更新時間

## 🚀 自動更新功能

### 進入應用時自動更新
```typescript
// 自動更新股票資料 - 在持股資料載入完成後執行
useEffect(() => {
  if (!isLoadingData && Object.keys(userHoldings).length > 0 && !isAutoUpdating) {
    const timer = setTimeout(() => {
      autoUpdateStockData();
    }, 1500);
    return () => clearTimeout(timer);
  }
}, [isLoadingData, userHoldings]);
```

### 手動更新
- 點擊「手動更新股票資料」按鈕
- 立即觸發完整的數據流程

## ✅ 流程驗證

### 測試方式
1. **主應用程式**: http://localhost:5173/
   - 觀察自動更新過程
   - 測試手動更新功能
   - 檢查個股卡片現價是否正確

2. **流程測試頁面**: http://localhost:5173/test-complete-flow.html
   - 模擬完整數據流程
   - 驗證每個步驟的正確性

3. **解析測試頁面**: http://localhost:5173/test-warehouse-parsing.html
   - 測試 warehouse.md 解析功能
   - 驗證資料格式正確性

## 🎉 總結

✅ **完整流程已實現**:
- 爬蟲 → 更新 warehouse.md → 讀取 warehouse.md → 更新卡片資訊

✅ **雙重保障**:
- 立即更新確保用戶體驗
- 同步更新確保資料一致性

✅ **自動化**:
- 進入應用自動更新
- 手動更新隨時可用

✅ **資料準確性**:
- 基於真實 Yahoo 股市價格
- 智能模擬資料作為備用

現在個股卡片顯示的現價與 warehouse.md 中的資料完全一致！🎯
