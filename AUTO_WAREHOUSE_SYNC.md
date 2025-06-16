# 自動同步 warehouse.md 功能說明

## 🎯 **功能概述**

現在當您在app中進行任何持股操作時，系統會自動同步更新 `warehouse.md` 文件，確保卡片顯示和文件內容始終保持一致。

## ✅ **支援的操作**

### 1. **新增股票**
- **操作**: 在持股管理區域新增股票
- **行為**: 
  - ✅ 立即更新持股卡片
  - ✅ 自動更新 warehouse.md 文件
  - ✅ 顯示成功通知
  - ✅ 自動備份原文件

### 2. **修改股數**
- **操作**: 調整現有股票的持股數量
- **行為**: 
  - ✅ 立即更新持股卡片
  - ✅ 自動更新 warehouse.md 文件
  - ✅ 靜默更新（不顯示通知，避免過於頻繁）

### 3. **移除股票**
- **操作**: 從持股中移除股票
- **行為**: 
  - ✅ 立即從卡片移除
  - ✅ 自動從 warehouse.md 移除
  - ✅ 顯示成功通知
  - ✅ 自動備份原文件

## 🔧 **技術實現**

### 核心函數修改

#### `handleAddStockToHoldings` (新增股票)
```typescript
const handleAddStockToHoldings = async (symbol: StockSymbol, shares: number) => {
  // 1. 更新本地狀態
  const updatedHoldings = { ...userHoldings, [symbol]: shares };
  setUserHoldings(updatedHoldings);
  
  // 2. 生成更新後的 warehouse.md 內容
  const updatedWarehouseContent = await autoUpdateWarehouseContent(updatedHoldings);
  
  // 3. 自動更新文件
  const updateResult = await WarehouseApiService.performAutoUpdate(updatedWarehouseContent);
  
  // 4. 顯示通知
  setNotification({ message: "✅ 已新增股票並自動更新 warehouse.md" });
};
```

#### `handleHoldingSharesChange` (修改股數)
```typescript
const handleHoldingSharesChange = async (symbol: StockSymbol, shares: number) => {
  // 1. 更新本地狀態
  const updatedHoldings = { ...userHoldings, [symbol]: shares };
  setUserHoldings(updatedHoldings);
  
  // 2. 靜默更新 warehouse.md
  const updatedWarehouseContent = await autoUpdateWarehouseContent(updatedHoldings);
  await WarehouseApiService.performAutoUpdate(updatedWarehouseContent);
};
```

#### `handleRemoveStockFromHoldings` (移除股票)
```typescript
const handleRemoveStockFromHoldings = async (symbol: StockSymbol) => {
  // 1. 更新本地狀態
  const updatedHoldings = { ...userHoldings };
  delete updatedHoldings[symbol];
  setUserHoldings(updatedHoldings);
  
  // 2. 更新 warehouse.md
  const updatedWarehouseContent = await autoUpdateWarehouseContent(updatedHoldings);
  await WarehouseApiService.performAutoUpdate(updatedWarehouseContent);
  
  // 3. 顯示通知
  setNotification({ message: "✅ 已移除股票並自動更新 warehouse.md" });
};
```

## 📁 **文件格式**

warehouse.md 文件格式保持不變：
```
股票代號	持股數量	股票名稱	現價	漲跌	漲跌%	更新時間
006208	289	富邦台50	110.25	0.00	0.00	2025-06-16T12:33:01.264Z
00713	1133	元大台灣高息低波	51.90	0.00	0.00	2025-06-16T12:33:02.001Z
```

## 🛡️ **安全機制**

### 1. **自動備份**
- 每次更新前自動備份原文件
- 備份文件命名格式: `warehouse.backup.YYYY-MM-DDTHH-mm-ss-sssZ.md`

### 2. **錯誤處理**
- 如果 warehouse updater 服務未運行，顯示相應提示
- 如果更新失敗，卡片仍會正常更新，並顯示錯誤通知

### 3. **服務檢查**
- 自動檢查 warehouse updater 服務狀態
- 根據服務可用性調整更新策略

## 🚀 **使用方式**

### 前置條件
1. **啟動 warehouse updater 服務**:
   ```bash
   cd server && npm start
   ```
   或使用快捷腳本:
   ```bash
   ./start-auto-update.sh  # macOS/Linux
   start-auto-update.bat   # Windows
   ```

2. **確認服務運行**: 
   - 服務地址: http://localhost:3001
   - 監控文件: warehouse.md

### 操作步驟
1. **新增股票**: 在持股管理區域輸入股票代號和股數，點擊新增
2. **修改股數**: 直接在持股卡片中調整股數
3. **移除股票**: 點擊持股卡片上的移除按鈕

## 📊 **通知系統**

### 通知類型
- **成功通知** (綠色): 操作成功完成
- **錯誤通知** (紅色): 操作失敗或部分失敗
- **資訊通知** (藍色): 服務狀態提示

### 通知內容
- ✅ 已新增股票 XXX (100股) 並自動更新 warehouse.md
- ✅ 已移除股票 XXX 並自動更新 warehouse.md
- ⚠️ 股票已新增到卡片，但 warehouse.md 更新失敗
- ⚠️ 自動更新服務未運行，請啟動 Warehouse Updater Service

## 🔄 **工作流程**

```
用戶操作 → 更新卡片狀態 → 生成新的warehouse內容 → 調用API更新文件 → 顯示通知
    ↓              ↓                    ↓                  ↓            ↓
  新增股票      立即顯示新卡片        包含新股票資訊        自動備份+更新     成功/失敗提示
  修改股數      立即更新股數          更新對應股數          靜默更新         無通知
  移除股票      立即移除卡片          移除對應條目          自動備份+更新     成功/失敗提示
```

## 🎯 **優勢**

1. **即時同步**: 操作立即反映到文件中
2. **自動備份**: 每次更新都有備份保護
3. **錯誤恢復**: 即使更新失敗，卡片仍正常工作
4. **用戶友好**: 清晰的通知和狀態提示
5. **完全自動化**: 無需手動下載或替換文件

這個功能確保了app中的持股管理和warehouse.md文件始終保持完美同步！
