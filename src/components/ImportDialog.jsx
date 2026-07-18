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
 * - 显示导入预览（文件含 X 条，当前有 Y 条）
 * - 选择覆盖导入 / 合并导入
 * - 确认执行导入
 *
 * @param {{ open: boolean, onClose: () => void, orders: Array, importOrders: (orders, mode) => { added, skipped } }} props
 */
export default function ImportDialog({ open, onClose, orders, importOrders }) {
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

        // 验证格式：必须包含 orders 数组
        if (!data.orders || !Array.isArray(data.orders)) {
          setError('文件格式不正确：缺少 orders 数组字段');
          setStep('select');
          return;
        }

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
      const result = importOrders(fileData.orders, mode);
      setImportResult(result);
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
  const currentOrderCount = orders?.length || 0;

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

            <Box sx={{ display: 'flex', gap: 4, mb: 2 }}>
              <Box>
                <Typography variant="h6" color="primary.main">
                  {fileOrderCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  文件中订单数
                </Typography>
              </Box>
              <Box>
                <Typography variant="h6">
                  {currentOrderCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  当前已有订单数
                </Typography>
              </Box>
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
                覆盖导入将删除当前全部 {currentOrderCount} 条订单，替换为文件中的 {fileOrderCount} 条。此操作不可恢复！
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
            <Alert severity="success" sx={{ mb: 2 }}>
              数据导入成功！
            </Alert>
            <Typography variant="body1" gutterBottom>
              新增 {importResult.added} 条订单
              {importResult.skipped > 0 && (
                <Typography component="span" color="text.secondary">
                  ，跳过 {importResult.skipped} 条（PO 号重复）
                </Typography>
              )}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              页面即将刷新以展示最新数据
            </Typography>
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
