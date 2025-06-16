const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;

// 啟用 CORS 和 JSON 解析
app.use(cors());
app.use(express.json());

// 檔案路徑
const WAREHOUSE_PATH = path.join(__dirname, '../warehouse.md');
const ADVICE_PATH = path.join(__dirname, '../advice.md');

/**
 * 讀取 warehouse.md 檔案
 */
app.get('/api/warehouse', async (req, res) => {
  try {
    const content = await fs.readFile(WAREHOUSE_PATH, 'utf8');
    res.json({ success: true, content });
  } catch (error) {
    console.error('讀取 warehouse.md 失敗:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 更新 warehouse.md 檔案
 */
app.post('/api/warehouse/update', async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ success: false, error: '缺少檔案內容' });
    }

    // 備份原檔案
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(__dirname, `../warehouse.backup.${timestamp}.md`);
    
    try {
      const originalContent = await fs.readFile(WAREHOUSE_PATH, 'utf8');
      await fs.writeFile(backupPath, originalContent);
      console.log(`已備份原檔案到: ${backupPath}`);
    } catch (backupError) {
      console.warn('備份失敗，但繼續更新:', backupError.message);
    }

    // 寫入新內容
    await fs.writeFile(WAREHOUSE_PATH, content, 'utf8');
    
    console.log('warehouse.md 已成功更新');
    res.json({ 
      success: true, 
      message: 'warehouse.md 已成功更新',
      backupPath: backupPath
    });

  } catch (error) {
    console.error('更新 warehouse.md 失敗:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 獲取備份檔案列表
 */
app.get('/api/warehouse/backups', async (req, res) => {
  try {
    const files = await fs.readdir(path.dirname(WAREHOUSE_PATH));
    const backups = files
      .filter(file => file.startsWith('warehouse.backup.') && file.endsWith('.md'))
      .sort()
      .reverse(); // 最新的在前面

    res.json({ success: true, backups });
  } catch (error) {
    console.error('獲取備份列表失敗:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 讀取 advice.md 檔案
 */
app.get('/api/advice', async (req, res) => {
  try {
    const content = await fs.readFile(ADVICE_PATH, 'utf8');
    res.json({ success: true, content });
  } catch (error) {
    if (error.code === 'ENOENT') {
      // 檔案不存在，返回空內容
      res.json({ success: true, content: '' });
    } else {
      console.error('讀取 advice.md 失敗:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

/**
 * 更新 advice.md 檔案
 */
app.post('/api/advice/update', async (req, res) => {
  try {
    const { content } = req.body;

    if (content === undefined) {
      return res.status(400).json({ success: false, error: '缺少檔案內容' });
    }

    // 備份原檔案（如果存在）
    let backupPath = null;
    try {
      const originalContent = await fs.readFile(ADVICE_PATH, 'utf8');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      backupPath = path.join(__dirname, `../advice.backup.${timestamp}.md`);
      await fs.writeFile(backupPath, originalContent);
      console.log(`已備份原 advice.md 到: ${backupPath}`);
    } catch (backupError) {
      if (backupError.code !== 'ENOENT') {
        console.warn('備份 advice.md 失敗，但繼續更新:', backupError.message);
      }
    }

    // 寫入新內容
    await fs.writeFile(ADVICE_PATH, content, 'utf8');

    console.log('advice.md 已成功更新');
    res.json({
      success: true,
      message: 'advice.md 已成功更新',
      backupPath: backupPath
    });

  } catch (error) {
    console.error('更新 advice.md 失敗:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 健康檢查
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Warehouse Updater Service is running',
    timestamp: new Date().toISOString()
  });
});

// 啟動服務器
app.listen(PORT, () => {
  console.log(`🚀 Warehouse Updater Service 運行在 http://localhost:${PORT}`);
  console.log(`📁 監控檔案: ${WAREHOUSE_PATH}`);
});

// 優雅關閉
process.on('SIGINT', () => {
  console.log('\n👋 正在關閉 Warehouse Updater Service...');
  process.exit(0);
});

module.exports = app;
