# Google Docs 配置

## 設定說明
請將以下資訊替換為您的實際 Google Docs 配置：

### Google Docs 資訊
warehouse_document_id="YOUR_WAREHOUSE_DOCUMENT_ID"
advice_document_id="YOUR_ADVICE_DOCUMENT_ID"
api_key="YOUR_GOOGLE_DOCS_API_KEY"

## 設定步驟

### 1. 創建 Google Sheets
1. 前往 [Google Sheets](https://sheets.google.com)
2. 創建新的試算表
3. 重新命名為「投資管理系統」
4. 創建兩個工作表：
   - 「投資組合」（用於 warehouse.md 數據）
   - 「AI建議記錄」（用於 advice.md 數據）

### 2. 獲取 Spreadsheet ID
從 Google Sheets URL 中提取 ID：
```
https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
```

### 3. 獲取 Google Sheets API Key
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 創建新專案或選擇現有專案
3. 啟用 Google Sheets API
4. 創建 API 金鑰（限制為 Google Sheets API）
5. 複製 API 金鑰

### 4. 設定工作表權限
1. 在 Google Sheets 中點擊「共用」
2. 將權限設為「知道連結的使用者」可以「檢視」
3. 或者設為「公開」（如果您不介意公開）

## 工作表結構

### 投資組合工作表 (warehouse.md)
| 股票代號 | 持股數量 | 股票名稱 | 現價 | 漲跌 | 漲跌% | 更新時間 |
|---------|---------|---------|------|------|-------|----------|
| 006208  | 289     | 富邦台50 | 110.70 | 0.00 | 0.00 | 2025-06-17... |

### AI建議記錄工作表 (advice.md)
| 日期 | AI模型 | 市場展望 | 投資金額 | 分配金額 | 建議內容 |
|------|--------|----------|----------|----------|----------|
| 2025/06/17 | Meta | 目前台灣股市... | 8000 | 260465 | 📈 台積電... |

## 使用說明
配置完成後，系統會自動：
1. 解析 warehouse.md 和 advice.md 文件
2. 將數據格式化為表格形式
3. 通過 Google Sheets API 更新線上試算表
4. 提供即時的線上查看功能
