import React, { useState, useRef } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import CircularProgress from '@mui/material/CircularProgress';
import FileOpenIcon from '@mui/icons-material/FileOpen';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

/**
 * 导入数据 Dialog
 * - 选择 JSON 文件
 * - 解析并验证格式
 * - 显示导入预览（订单 + 客户 + 工厂）
 * - 选择覆盖导入 / 合并导入
 * - 确认执行导入（通过 onImportAll 回调由父组件处理） */
export default function ImportDialog({ open, onClose, orders, importOrders, customers = [], factories = [] }) {
  const [step, setStep] = useState('select'); // 'select' | 'preview' | 'importing' | 'done'
  const [fileData, setFileData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [mode, setMode] = useState('merge');
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef(null);

  /** 重置状态 */
  const resetState = () => {
    setStep('select');
    setFileData(null);
    setFileName('');
    setMode('merge');
    setError('');
    setImportResult(null);
    if (fileRef.current) {
      fileRef.current.value = '';
    }
  };

  /** 关闭弹窗并重置 */
  const handleClose = () => {
    resetState();
    onClose();
  };

  /** 处理文件选择，解析 JSON 并验证格式 */
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const data = JSON.parse(text);

        // 验证格式：必须包含 orders 数组（兼容旧格式只有 orders 的文件）
        if (!data.orders || !Array.isArray(data.orders)) {
          setError('文件格式不正确：缺少 orders 数组字段');
          setStep('select');
          return;
        }

        // 检查并规范化附属数据
        if (!Array.isArray(data.customers)) data.customers = [];
        if (!Array.isArray(data.factories)) data.factories = [];

        // 验证每个订单至少有关键字段
        const invalidOrders = data.orders.filter(
          (o) => !o || typeof o !== 'object' || !o.poNumber || !o.customerName
        );
        if (invalidOrders.length > 0) {
          setError(
            `文件中有 ${invalidOrders.length} 条数据格式不正确（缺少 poNumber 或 customerName），请检查文件`
          );
          setStep('select');
          return;
        }

        setFileData(data);
        setStep('preview');
      } catch (err) {
        if (err instanceof SyntaxError) {
          setError('文件解析失败：JSON 格式无效，请检查文件内容');
        } else {
          setError(err.message || '文件读取失败');
        }
        setStep('select');
      }
    };
    reader.onerror = () => {
      setError('文件读取失败，请重试');
      setStep('select');
    };
    reader.readAsText(file);
  };

  /** 执行导入 */
  const handleImport = () => {
    if (!fileData) return;
    setStep('importing');
    setError('');

    try {
      const orderResult = importOrders(fileData.orders, mode);

      // 导入客户（如果有）
      let custResult = null;
      if (fileData.customers.length > 0) {
        const key = 'order_tracking_customers';
        if (mode === 'overwrite') {
          localStorage.setItem(key, JSON.stringify(fileData.customers));
          custResult = { added: fileData.customers.length, skipped: 0 };
        } else {
          const existing = JSON.parse(localStorage.getItem(key) || '[]');
          const existingNames = new Set(existing.map((c) => c.name.toLowerCase().trim()));
          const newOnes = fileData.customers.filter(
            (c) => !existingNames.has((c.name || '').toLowerCase().trim())
          );
          if (newOnes.length > 0) {
            localStorage.setItem(key, JSON.stringify([...existing, ...newOnes]));
          }
          custResult = { added: newOnes.length, skipped: fileData.customers.length - newOnes.length };
        }
      }

      // 导入工厂（如果有）
      let factResult = null;
      if (fileData.factories.length > 0) {
        const key = 'order_tracking_factories';
        if (mode === 'overwrite') {
          localStorage.setItem(key, JSON.stringify(fileData.factories));
          factResult = { added: fileData.factories.length, skipped: 0 };
        } else {
          const existing = JSON.parse(localStorage.getItem(key) || '[]');
          const existingNames = new Set(existing.map((f) => f.name.toLowerCase().trim()));
          const newOnes = fileData.factories.filter(
            (f) => !existingNames.has((f.name || '').toLowerCase().trim())
          );
          if (newOnes.length > 0) {
            localStorage.setItem(key, JSON.stringify([...existing, ...newOnes]));
          }
          factResult = { added: newOnes.length, skipped: fileData.factories.length - newOnes.length };
        }
      }

      setImportResult({ orders: orderResult, customers: custResult, factories: factResult });
      setStep('done');
    } catch (err) {
      setError(err.message || '导入失败');
      setStep('preview');
    }
  };

  /** 完成导入，关闭弹窗并刷新页面 */
  const handleDone = () => {
    handleClose();
    // 刷新页面以反映最新数据
    window.location.reload();
  };

  const fileOrderCount = fileData?.orders?.length || 0;
  const fileCustomerCount = fileData?.customers?.length || 0;
  const fileFactoryCount = fileData?.factories?.length || 0;
  const currentOrderCount = orders?.length || 0;
  const currentCustomerCount = customers?.length || 0;
  const currentFactoryCount = factories?.length || 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>📥 导入数据</DialogTitle>

      <DialogContent>
        {/* 错误提示 */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Step 1: 选择文件 */}
        {step === 'select' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              选择之前导出的 JSON 备份文件
            </Typography>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              id="import-file-input"
              onChange={handleFileSelect}
            />
            <label htmlFor="import-file-input">
              <Button
                variant="outlined"
                component="span"
                startIcon={<FileOpenIcon />}
                size="large"
                sx={{ mt: 2 }}
              >
                选择 JSON 文件
              </Button>
            </label>
          </Box>
        )}

        {/* Step 2: 预览 */}
        {step === 'preview' && (
          <Box>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              导入预览
            </Typography>

            <Box sx={{ display: 'flex', gap: 4, mb: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="h6" color="primary.main">{fileOrderCount}</Typography>
                <Typography variant="caption" color="text.secondary">文件中订单数</Typography>
              </Box>
              <Box>
                <Typography variant="h6">{currentOrderCount}</Typography>
                <Typography variant="caption" color="text.secondary">当前已有订单数</Typography>
              </Box>
              {fileCustomerCount > 0 && (
                <Box>
                  <Typography variant="h6" color="primary.main">{fileCustomerCount}</Typography>
                  <Typography variant="caption" color="text.secondary">文件中客户数 (已有 {currentCustomerCount})</Typography>
                </Box>
              )}
              {fileFactoryCount > 0 && (
                <Box>
                  <Typography variant="h6" color="primary.main">{fileFactoryCount}</Typography>
                  <Typography variant="caption" color="text.secondary">文件中工厂数 (已有 {currentFactoryCount})</Typography>
                </Box>
              )}
            </Box>

            {fileData?.exportTime && (
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                备份时间：{fileData.exportTime}
              </Typography>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              导入模式
            </Typography>
            <RadioGroup value={mode} onChange={(e) => setMode(e.target.value)}>
              <FormControlLabel
                value="merge"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      合并导入（推荐）
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      追加新订单，已存在的 PO 号自动跳过不覆盖
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="overwrite"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      覆盖导入
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      清空当前所有订单，替换为文件中的全部数据
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>

            {mode === 'overwrite' && (
              <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mt: 2 }}>
                覆盖导入将删除当前全部数据（{currentOrderCount} 订单 / {currentCustomerCount} 客户 / {currentFactoryCount} 工厂），替换为文件中的 {fileOrderCount} 订单 / {fileCustomerCount} 客户 / {fileFactoryCount} 工厂。此操作不可恢复！
              </Alert>
            )}
          </Box>
        )}

        {/* Step 3: 导入中 */}
        {step === 'importing' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              正在导入数据...
            </Typography>
          </Box>
        )}

        {/* Step 4: 完成 */}
        {step === 'done' && importResult && (
          <Box sx={{ py: 2 }}>
            <Alert severity="success" sx={{ mb: 2 }}>数据导入成功！</Alert>
            <Typography variant="body1" gutterBottom>
              订单：新增 {importResult.orders?.added ?? 0} 条
              {importResult.orders?.skipped > 0 && (
                <Typography component="span" color="text.secondary">，跳过 {importResult.orders.skipped} 条（PO 号重复）</Typography>
              )}
            </Typography>
            {importResult.customers && (
              <Typography variant="body1" gutterBottom>
                客户：新增 {importResult.customers.added} 位
                {importResult.customers.skipped > 0 && (
                  <Typography component="span" color="text.secondary">，跳过 {importResult.customers.skipped} 位（重名）</Typography>
                )}
              </Typography>
            )}
            {importResult.factories && (
              <Typography variant="body1" gutterBottom>
                工厂：新增 {importResult.factories.added} 家
                {importResult.factories.skipped > 0 && (
                  <Typography component="span" color="text.secondary">，跳过 {importResult.factories.skipped} 家（重名）</Typography>
                )}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">页面即将刷新以展示最新数据</Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {step === 'select' && (
          <Button onClick={handleClose}>取消</Button>
        )}
        {step === 'preview' && (
          <>
            <Button onClick={() => setStep('select')}>重新选择</Button>
            <Button variant="contained" onClick={handleImport}>
              确认导入
            </Button>
          </>
        )}
        {step === 'done' && (
          <Button variant="contained" onClick={handleDone}>
            完成
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
